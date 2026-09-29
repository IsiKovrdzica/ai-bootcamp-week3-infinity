import { describe, expect, it, vi } from 'vitest'
import { createAdviceService, type AdviceTiming } from './advice-service.js'
import { FakeAiAdviceProvider } from './fake-provider.js'
import { classifyGeminiFailure } from './gemini-provider.js'
import { validWonSummary } from './game-summary-fixtures.js'
import { ProviderFailure } from './provider.js'
import type { AiUsageEvent, AiUsageSink } from './usage-log.js'

const forbiddenDiagnosticKeys = [
  'gameSummary', 'request', 'providerPayload', 'prompt', 'apiKey', 'error', 'stack',
]

function expectSanitized(events: AiUsageEvent[]) {
  for (const event of events) {
    for (const key of forbiddenDiagnosticKeys) expect(event).not.toHaveProperty(key)
  }
  expect(JSON.stringify(events)).not.toContain('bricksDestroyed')
  expect(JSON.stringify(events)).not.toContain('must not escape')
}

function immediateTiming(): AdviceTiming {
  let now = 0
  return { now: () => now, sleep: async (milliseconds) => { now += milliseconds }, setTimeout, clearTimeout }
}

function unavailableProvider() {
  return {
    providerCallCount: 0,
    async generateAdvice() {
      this.providerCallCount += 1
      throw new ProviderFailure('provider_unavailable')
    },
  }
}

describe('AiUsageEvent sink', () => {
  it('records one initial primary success event with sanitized metadata', async () => {
    const events: AiUsageEvent[] = []
    const service = createAdviceService(new FakeAiAdviceProvider({ mode: 'success' }), undefined, {
      usageSink: (event) => events.push(event), provider: 'fake', model: 'primary-model',
    })

    await service.requestAdvice(validWonSummary)

    expect(events).toMatchObject([{ provider: 'fake', model: 'primary-model', outcome: 'success', attemptCount: 1, attemptKind: 'initial' }])
    expectSanitized(events)
  })

  it('records initial failure then same-primary retry success', async () => {
    const events: AiUsageEvent[] = []
    const service = createAdviceService(new FakeAiAdviceProvider({ mode: 'transientThenSuccess' }), immediateTiming(), {
      usageSink: (event) => events.push(event), provider: 'gemini', model: 'primary-model', fallbackModel: 'fallback-model',
    })

    await service.requestAdvice(validWonSummary)

    expect(events).toMatchObject([
      { provider: 'gemini', model: 'primary-model', outcome: 'failure', attemptCount: 1, attemptKind: 'initial' },
      { provider: 'gemini', model: 'primary-model', outcome: 'success', attemptCount: 2, attemptKind: 'retry' },
    ])
    expectSanitized(events)
  })

  it('records initial primary failure then fallback-model success', async () => {
    const events: AiUsageEvent[] = []
    const service = createAdviceService(unavailableProvider(), immediateTiming(), {
      usageSink: (event) => events.push(event), provider: 'gemini', model: 'primary-model', fallbackModel: 'fallback-model',
    }, new FakeAiAdviceProvider({ mode: 'success' }))

    await service.requestAdvice(validWonSummary)

    expect(events).toMatchObject([
      { provider: 'gemini', model: 'primary-model', outcome: 'failure', attemptCount: 1, attemptKind: 'initial' },
      { provider: 'gemini', model: 'fallback-model', outcome: 'success', attemptCount: 2, attemptKind: 'fallback' },
    ])
    expectSanitized(events)
  })

  it('records a sanitized plain-404 primary failure and fixed-fallback success', async () => {
    const events: AiUsageEvent[] = []
    const primary = {
      providerCallCount: 0,
      async generateAdvice(_summary: unknown, { signal }: { signal: AbortSignal }) {
        this.providerCallCount += 1
        throw new ProviderFailure(classifyGeminiFailure({ status: 404 }, signal))
      },
    }
    const service = createAdviceService(primary, immediateTiming(), {
      usageSink: (event) => events.push(event),
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      fallbackModel: 'gemini-3.5-flash-lite',
    }, new FakeAiAdviceProvider({ mode: 'success' }))

    await service.requestAdvice(validWonSummary)

    expect(events).toMatchObject([
      { model: 'gemini-2.5-flash-lite', outcome: 'failure', failureKind: 'provider_unavailable', attemptCount: 1, attemptKind: 'initial' },
      { model: 'gemini-3.5-flash-lite', outcome: 'success', attemptCount: 2, attemptKind: 'fallback' },
    ])
    expectSanitized(events)
  })

  it('records exactly two safe events when the fallback fails', async () => {
    const events: AiUsageEvent[] = []
    const service = createAdviceService(unavailableProvider(), immediateTiming(), {
      usageSink: (event) => events.push(event), provider: 'gemini', model: 'primary-model', fallbackModel: 'fallback-model',
    }, unavailableProvider())

    await service.requestAdvice(validWonSummary)

    expect(events).toMatchObject([
      { model: 'primary-model', outcome: 'failure', attemptCount: 1, attemptKind: 'initial' },
      { model: 'fallback-model', outcome: 'failure', attemptCount: 2, attemptKind: 'fallback' },
    ])
    expect(events).toHaveLength(2)
    expectSanitized(events)
  })

  it('classifies malformed unknown provider output as sanitized invalid_output', async () => {
    const events: AiUsageEvent[] = []
    const service = createAdviceService(new FakeAiAdviceProvider({ mode: 'malformed', malformedOutput: { summary: 'bad' } }), immediateTiming(), {
      usageSink: (event) => events.push(event), provider: 'gemini', model: 'primary-model',
    })

    await service.requestAdvice(validWonSummary)

    expect(events).toMatchObject([{ outcome: 'failure', failureKind: 'invalid_output', attemptCount: 1, attemptKind: 'initial' }])
    expectSanitized(events)
  })

  it('keeps provider_unavailable distinguishable without raw provider details', async () => {
    const events: AiUsageEvent[] = []
    const service = createAdviceService(unavailableProvider(), immediateTiming(), {
      usageSink: (event) => events.push(event), provider: 'gemini', model: 'primary-model',
    })

    await service.requestAdvice(validWonSummary)

    expect(events).toMatchObject([{ outcome: 'failure', failureKind: 'provider_unavailable', attemptCount: 1, attemptKind: 'initial' }])
    expectSanitized(events)
  })

  it('records no provider-attempt event for invalid local input', async () => {
    const events: AiUsageEvent[] = []
    const provider = new FakeAiAdviceProvider({ mode: 'success' })
    const service = createAdviceService(provider, undefined, { usageSink: (event) => events.push(event) })

    await service.requestAdvice(null)

    expect(provider.providerCallCount).toBe(0)
    expect(events).toEqual([])
  })

  it('records a timeout only for the actual attempt begun before the deadline', async () => {
    vi.useFakeTimers()
    try {
      const events: AiUsageEvent[] = []
      const timing: AdviceTiming = { now: () => Date.now(), sleep: async () => {}, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout }
      const service = createAdviceService(new FakeAiAdviceProvider({ mode: 'delayed' }), timing, {
        usageSink: (event) => events.push(event), provider: 'fake', model: 'primary-model',
      })
      const pending = service.requestAdvice(validWonSummary)
      await vi.advanceTimersByTimeAsync(15_000)
      await pending
      expect(events).toMatchObject([{ model: 'primary-model', outcome: 'timeout', attemptCount: 1, attemptKind: 'initial' }])
      expectSanitized(events)
    } finally { vi.useRealTimers() }
  })

  it('allows only safe numeric token usage metadata on the sink contract', () => {
    const events: AiUsageEvent[] = []
    const sink: AiUsageSink = (event) => events.push(event)
    sink({ provider: 'gemini', model: 'configured-model', timestamp: '2026-09-29T00:00:00.000Z', latencyMs: 12, outcome: 'success', attemptCount: 1, attemptKind: 'initial', tokenUsage: { input: 21, output: 8 } })
    expect(events).toHaveLength(1)
    expectSanitized(events)
  })
})
