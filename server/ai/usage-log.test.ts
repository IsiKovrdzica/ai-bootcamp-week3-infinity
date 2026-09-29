import { describe, expect, it, vi } from 'vitest'
import { createAdviceService, type AdviceTiming } from './advice-service.js'
import { FakeAiAdviceProvider } from './fake-provider.js'
import { validWonSummary } from './game-summary-fixtures.js'
import type { AiUsageEvent, AiUsageSink } from './usage-log.js'

const forbiddenDiagnosticKeys = [
  'gameSummary',
  'request',
  'providerPayload',
  'prompt',
  'apiKey',
  'error',
  'stack',
]

function expectOneSanitizedEvent(
  events: AiUsageEvent[],
  expected: Pick<AiUsageEvent, 'outcome' | 'attemptCount'>,
) {
  expect(events).toHaveLength(1)
  expect(events[0]).toEqual({
    provider: 'fake',
    model: 'fake',
    timestamp: expect.any(String),
    latencyMs: expect.any(Number),
    ...expected,
  })
  for (const key of forbiddenDiagnosticKeys) {
    expect(events[0]).not.toHaveProperty(key)
  }
}

describe('AiUsageEvent sink', () => {
  it('emits only sanitized success metadata', async () => {
    const events: AiUsageEvent[] = []
    const service = createAdviceService(
      new FakeAiAdviceProvider({ mode: 'success' }),
      undefined,
      { usageSink: (event) => events.push(event), provider: 'fake', model: 'fake' },
    )
    await service.requestAdvice(validWonSummary)
    expectOneSanitizedEvent(events, { outcome: 'success', attemptCount: 1 })
    expect(JSON.stringify(events)).not.toContain('bricksDestroyed')
  })

  it('records invalid input with zero attempts and no payload', async () => {
    const events: AiUsageEvent[] = []
    const provider = new FakeAiAdviceProvider({ mode: 'success' })
    const service = createAdviceService(provider, undefined, { usageSink: (event) => events.push(event), provider: 'fake', model: 'fake' })
    await service.requestAdvice(null)
    expect(provider.providerCallCount).toBe(0)
    expectOneSanitizedEvent(events, { outcome: 'failure', attemptCount: 0 })
  })

  it.each([
    { name: 'permanent provider failure', mode: 'permanentFailure' as const, attempts: 1 },
    { name: 'exhausted transient failure', mode: 'transientFailure' as const, attempts: 2 },
    { name: 'malformed provider output', mode: 'malformed' as const, attempts: 1 },
  ])('emits one sanitized failure event for $name', async ({ mode, attempts }) => {
    const events: AiUsageEvent[] = []
    const provider = new FakeAiAdviceProvider({
      mode,
      malformedOutput: { providerPayload: 'must not escape' },
    })
    const service = createAdviceService(provider, immediateTiming(), {
      usageSink: (event) => events.push(event),
      provider: 'fake',
      model: 'fake',
    })

    await service.requestAdvice(validWonSummary)

    expect(provider.providerCallCount).toBe(attempts)
    expectOneSanitizedEvent(events, {
      outcome: 'failure',
      attemptCount: attempts as 1 | 2,
    })
    expect(JSON.stringify(events)).not.toContain('must not escape')
  })

  it('emits one timeout event with the number of attempts begun before the shared deadline', async () => {
    vi.useFakeTimers()
    try {
      const events: AiUsageEvent[] = []
      const provider = new FakeAiAdviceProvider({ mode: 'delayed' })
      const timing: AdviceTiming = {
        now: () => Date.now(),
        sleep: async () => {},
        setTimeout: globalThis.setTimeout,
        clearTimeout: globalThis.clearTimeout,
      }
      const service = createAdviceService(provider, timing, {
        usageSink: (event) => events.push(event),
        provider: 'fake',
        model: 'fake',
      })

      const pending = service.requestAdvice(validWonSummary)
      await vi.advanceTimersByTimeAsync(15_000)
      await pending

      expect(provider.providerCallCount).toBe(1)
      expectOneSanitizedEvent(events, { outcome: 'timeout', attemptCount: 1 })
    } finally {
      vi.useRealTimers()
    }
  })

  it('allows only safe numeric token usage metadata on the sink contract', () => {
    const events: AiUsageEvent[] = []
    const sink: AiUsageSink = (event) => events.push(event)
    sink({
      provider: 'gemini',
      model: 'configured-model',
      timestamp: '2026-09-29T00:00:00.000Z',
      latencyMs: 12,
      outcome: 'success',
      attemptCount: 1,
      tokenUsage: { input: 21, output: 8 },
    })

    expect(events).toEqual([{
      provider: 'gemini',
      model: 'configured-model',
      timestamp: '2026-09-29T00:00:00.000Z',
      latencyMs: 12,
      outcome: 'success',
      attemptCount: 1,
      tokenUsage: { input: 21, output: 8 },
    }])
    for (const key of forbiddenDiagnosticKeys) {
      expect(events[0]).not.toHaveProperty(key)
    }
  })
})

function immediateTiming(): AdviceTiming {
  let now = 0
  return {
    now: () => now,
    sleep: async (milliseconds) => { now += milliseconds },
    setTimeout,
    clearTimeout,
  }
}
