import { describe, expect, it, vi } from 'vitest'
import type { AdviceTiming } from './advice-service.js'
import { ProviderFailure } from './provider.js'
import { FakeAiAdviceProvider } from './fake-provider.js'
import {
  invalidGameSummaryFixtures,
  validWonSummary,
} from './game-summary-fixtures.js'
import { createAdviceService } from './advice-service.js'

const validAdvice = {
  summary: 'You cleared every brick.',
  recommendation: 'Center the paddle before the next return.',
  category: 'efficiency' as const,
}

describe('advice service validation-before-provider boundary', () => {
  it('returns exact validated advice for a valid summary and fake success', async () => {
    const provider = new FakeAiAdviceProvider({
      mode: 'success',
      advice: validAdvice,
    })
    const service = createAdviceService(provider)

    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({
      ok: true,
      advice: validAdvice,
    })
    expect(provider.providerCallCount).toBe(1)
  })

  it.each(invalidGameSummaryFixtures)(
    'rejects invalid summary %# before provider invocation',
    async (invalidSummary) => {
      const provider = new FakeAiAdviceProvider({
        mode: 'success',
        advice: validAdvice,
      })
      const service = createAdviceService(provider)

      await expect(service.requestAdvice(invalidSummary)).resolves.toEqual({
        ok: false,
        kind: 'invalid_summary',
      })
      expect(provider.providerCallCount).toBe(0)
    },
  )

  it.each([
    { summary: 'x', recommendation: 'y', category: 'unknown' },
    { summary: ' ', recommendation: 'valid', category: 'general' },
    { summary: 2, recommendation: 'valid', category: 'general' },
  ])(
    'returns unavailable after one malformed provider result %#',
    async (malformedOutput) => {
      const provider = new FakeAiAdviceProvider({
        mode: 'malformed',
        malformedOutput,
      })
      const service = createAdviceService(provider)

      await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({
        ok: false,
        kind: 'unavailable',
      })
      expect(provider.providerCallCount).toBe(1)
    },
  )

  it('rejects an unexpected provider field instead of stripping it', async () => {
    const malformedOutput = { ...validAdvice, internalDetail: 'do not expose' }
    const provider = new FakeAiAdviceProvider({
      mode: 'malformed',
      malformedOutput,
    })
    const service = createAdviceService(provider)

    const result = await service.requestAdvice(validWonSummary)

    expect(result).toEqual({ ok: false, kind: 'unavailable' })
    expect(result).not.toMatchObject({
      ok: true,
      advice: validAdvice,
    })
    expect(provider.providerCallCount).toBe(1)
  })

  it('projects only the validated advice fields', async () => {
    const provider = new FakeAiAdviceProvider({
      mode: 'success',
      advice: validAdvice,
    })
    const service = createAdviceService(provider)

    const result = await service.requestAdvice(validWonSummary)

    expect(result).toEqual({ ok: true, advice: validAdvice })
    if (result.ok) {
      expect(Object.keys(result.advice).sort()).toEqual([
        'category',
        'recommendation',
        'summary',
      ])
    }
  })
})

describe('advice service shared deadline and retry', () => {
  const advice = {
    summary: 'Reviewed.',
    recommendation: 'Track the return.',
    category: 'general' as const,
  }

  it("expires one delayed attempt at the shared 15-second deadline and ignores a late result", async () => {
    vi.useFakeTimers()
    let resolveLate: ((value: unknown) => void) | undefined
    let aborted = false
    const provider = { providerCallCount: 0, generateAdvice(_summary: unknown, { signal }: { signal: AbortSignal }) {
      this.providerCallCount += 1
      signal.addEventListener("abort", () => { aborted = true })
      return new Promise<unknown>((resolve) => { resolveLate = resolve })
    } }
    const timing: AdviceTiming = { now: () => Date.now(), sleep: async () => {}, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout }
    const pending = createAdviceService(provider, timing).requestAdvice(validWonSummary)
    await vi.advanceTimersByTimeAsync(15_000)
    await expect(pending).resolves.toEqual({ ok: false, kind: "unavailable" })
    expect(provider.providerCallCount).toBe(1)
    expect(aborted).toBe(true)
    resolveLate?.(advice)
    await expect(pending).resolves.toEqual({ ok: false, kind: "unavailable" })
    vi.useRealTimers()
  })
  it('retries a transient failure once after 250 ms and succeeds', async () => {
    let now = 0
    const sleeps: number[] = []
    const provider = new FakeAiAdviceProvider({ mode: 'transientThenSuccess', advice })
    const service = createAdviceService(provider, {
      now: () => now,
      sleep: async (milliseconds) => { sleeps.push(milliseconds); now += milliseconds },
      setTimeout,
      clearTimeout,
    })
    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: true, advice })
    expect(provider.providerCallCount).toBe(2)
    expect(sleeps).toEqual([250])
  })

  it('makes two total attempts for two transient failures', async () => {
    const provider = new FakeAiAdviceProvider({ mode: 'transientFailure' })
    const service = createAdviceService(provider, immediateTiming())
    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: false, kind: 'unavailable' })
    expect(provider.providerCallCount).toBe(2)
  })

  it("does not retry when less than 250 ms remains", async () => {
    let now = 0
    const provider = { providerCallCount: 0, async generateAdvice() { this.providerCallCount += 1; now = 14_900; throw new ProviderFailure("transient") } }
    const service = createAdviceService(provider, { now: () => now, sleep: async () => {}, setTimeout, clearTimeout })
    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: false, kind: "unavailable" })
    expect(provider.providerCallCount).toBe(1)
  })

  it.each(['auth', 'configuration', 'safety', 'client_cancelled', 'permanent', 'programming'] as const)(
    'does not retry %s failures',
    async (kind) => {
      const provider = { providerCallCount: 0, async generateAdvice() { this.providerCallCount += 1; throw new ProviderFailure(kind) } }
      const service = createAdviceService(provider, immediateTiming())
      await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: false, kind: 'unavailable' })
      expect(provider.providerCallCount).toBe(1)
    },
  )

  it('does not retry malformed provider output', async () => {
    const provider = new FakeAiAdviceProvider({ mode: 'malformed', malformedOutput: { ...advice, extra: true } })
    const service = createAdviceService(provider, immediateTiming())
    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: false, kind: 'unavailable' })
    expect(provider.providerCallCount).toBe(1)
  })

  it.each(invalidGameSummaryFixtures)('never attempts or sleeps for invalid input %#', async (input) => {
    const provider = new FakeAiAdviceProvider({ mode: 'success', advice })
    const sleeps: number[] = []
    const timing = immediateTiming(0, sleeps)
    const service = createAdviceService(provider, timing)
    await expect(service.requestAdvice(input)).resolves.toEqual({ ok: false, kind: 'invalid_summary' })
    expect(provider.providerCallCount).toBe(0)
    expect(sleeps).toEqual([])
  })
})

function immediateTiming(initialNow = 0, sleeps: number[] = []): AdviceTiming {
  let now = initialNow
  return {
    now: () => now,
    sleep: async (milliseconds) => { sleeps.push(milliseconds); now += milliseconds },
    setTimeout,
    clearTimeout,
  }
}
