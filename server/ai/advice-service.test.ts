import { describe, expect, it, vi } from 'vitest'
import type { AdviceTiming } from './advice-service.js'
import { ProviderFailure, type ProviderFailureKind } from './provider.js'
import { FakeAiAdviceProvider } from './fake-provider.js'
import { classifyGeminiFailure } from './gemini-provider.js'
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

describe('advice service bounded retry-versus-fallback selection', () => {
  const advice = {
    summary: 'Reviewed.',
    recommendation: 'Track the return.',
    category: 'general' as const,
  }

  it('uses only primary for an initial success', async () => {
    const primary = new FakeAiAdviceProvider({ mode: 'success', advice })
    const fallback = new FakeAiAdviceProvider({ mode: 'success', advice })
    const service = createAdviceService(primary, immediateTiming(), {}, fallback)

    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: true, advice })
    expect(primary.providerCallCount).toBe(1)
    expect(fallback.providerCallCount).toBe(0)
    expect(primary.providerCallCount + fallback.providerCallCount).toBeLessThanOrEqual(2)
  })

  it.each(['network', '408', '429'] as const)('retries the primary after %s-class transient failure', async () => {
    const primary = new FakeAiAdviceProvider({ mode: 'transientThenSuccess', advice })
    const fallback = new FakeAiAdviceProvider({ mode: 'success', advice })
    const service = createAdviceService(primary, immediateTiming(), {}, fallback)

    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: true, advice })
    expect(primary.providerCallCount).toBe(2)
    expect(fallback.providerCallCount).toBe(0)
    expect(primary.providerCallCount + fallback.providerCallCount).toBe(2)
  })

  it.each(['500', '502', '503'] as const)('uses fallback after %s-class provider-unavailable failure', async () => {
    const primary = failingProvider('provider_unavailable')
    const fallback = new FakeAiAdviceProvider({ mode: 'success', advice })
    const service = createAdviceService(primary, immediateTiming(), {}, fallback)

    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: true, advice })
    expect(primary.providerCallCount).toBe(1)
    expect(fallback.providerCallCount).toBe(1)
    expect(primary.providerCallCount + fallback.providerCallCount).toBe(2)
  })

  it('uses the fallback after a plain 404 without retrying the primary', async () => {
    const primary = failingProvider(classifyGeminiFailure({ status: 404 }, new AbortController().signal))
    const fallback = new FakeAiAdviceProvider({ mode: 'success', advice })
    const service = createAdviceService(primary, immediateTiming(), {}, fallback)

    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: true, advice })
    expect(primary.providerCallCount).toBe(1)
    expect(fallback.providerCallCount).toBe(1)
    expect(primary.providerCallCount + fallback.providerCallCount).toBe(2)
  })

  it('returns unavailable after the fallback fails following a plain 404', async () => {
    const primary = failingProvider(classifyGeminiFailure({ status: 404 }, new AbortController().signal))
    const fallback = failingProvider('provider_unavailable')
    const service = createAdviceService(primary, immediateTiming(), {}, fallback)

    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: false, kind: 'unavailable' })
    expect(primary.providerCallCount).toBe(1)
    expect(fallback.providerCallCount).toBe(1)
    expect(primary.providerCallCount + fallback.providerCallCount).toBe(2)
  })

  it('returns unavailable after fallback fails and never exceeds two calls', async () => {
    const primary = failingProvider('provider_unavailable')
    const fallback = failingProvider('provider_unavailable')
    const service = createAdviceService(primary, immediateTiming(), {}, fallback)

    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: false, kind: 'unavailable' })
    expect(primary.providerCallCount).toBe(1)
    expect(fallback.providerCallCount).toBe(1)
    expect(primary.providerCallCount + fallback.providerCallCount).toBe(2)
  })

  it.each([
    { ...advice, extra: true },
    { summary: 'valid', recommendation: 'valid', category: 'invalid' },
  ])('applies the same validator to fallback output %#', async (malformedOutput) => {
    const primary = failingProvider('provider_unavailable')
    const fallback = new FakeAiAdviceProvider({ mode: 'malformed', malformedOutput })
    const service = createAdviceService(primary, immediateTiming(), {}, fallback)

    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: false, kind: 'unavailable' })
    expect(primary.providerCallCount).toBe(1)
    expect(fallback.providerCallCount).toBe(1)
    expect(primary.providerCallCount + fallback.providerCallCount).toBe(2)
  })

  it('does not start a retry or fallback when fewer than 250 ms remain', async () => {
    let now = 0
    const primary = {
      providerCallCount: 0,
      async generateAdvice() {
        this.providerCallCount += 1
        now = 14_900
        throw new ProviderFailure('provider_unavailable')
      },
    }
    const fallback = new FakeAiAdviceProvider({ mode: 'success', advice })
    const service = createAdviceService(primary, { now: () => now, sleep: async () => {}, setTimeout, clearTimeout }, {}, fallback)

    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: false, kind: 'unavailable' })
    expect(primary.providerCallCount).toBe(1)
    expect(fallback.providerCallCount).toBe(0)
  })

  it('does not start the fallback after a plain 404 when fewer than 250 ms remain', async () => {
    let now = 0
    const primary = {
      providerCallCount: 0,
      async generateAdvice(_summary: unknown, { signal }: { signal: AbortSignal }) {
        this.providerCallCount += 1
        now = 14_900
        throw new ProviderFailure(classifyGeminiFailure({ status: 404 }, signal))
      },
    }
    const fallback = new FakeAiAdviceProvider({ mode: 'success', advice })
    const service = createAdviceService(primary, { now: () => now, sleep: async () => {}, setTimeout, clearTimeout }, {}, fallback)

    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: false, kind: 'unavailable' })
    expect(primary.providerCallCount).toBe(1)
    expect(fallback.providerCallCount).toBe(0)
  })

  it('ignores a late fallback result after the shared deadline', async () => {
    vi.useFakeTimers()
    try {
      let resolveLate: ((value: unknown) => void) | undefined
      const primary = failingProvider('provider_unavailable')
      const fallback = {
        providerCallCount: 0,
        generateAdvice() {
          this.providerCallCount += 1
          return new Promise<unknown>((resolve) => { resolveLate = resolve })
        },
      }
      const timing: AdviceTiming = {
        now: () => Date.now(),
        sleep: async () => {},
        setTimeout: globalThis.setTimeout,
        clearTimeout: globalThis.clearTimeout,
      }
      const pending = createAdviceService(primary, timing, {}, fallback).requestAdvice(validWonSummary)
      await vi.advanceTimersByTimeAsync(15_000)
      await expect(pending).resolves.toEqual({ ok: false, kind: 'unavailable' })
      expect(primary.providerCallCount).toBe(1)
      expect(fallback.providerCallCount).toBe(1)
      resolveLate?.(advice)
      await expect(pending).resolves.toEqual({ ok: false, kind: 'unavailable' })
    } finally {
      vi.useRealTimers()
    }
  })

  it.each(['auth', 'configuration', 'safety', 'client_cancelled', 'permanent', 'programming'] as const)(
    'does not retry or fallback %s failures',
    async (kind) => {
      const primary = failingProvider(kind)
      const fallback = new FakeAiAdviceProvider({ mode: 'success', advice })
      const service = createAdviceService(primary, immediateTiming(), {}, fallback)

      await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: false, kind: 'unavailable' })
      expect(primary.providerCallCount).toBe(1)
      expect(fallback.providerCallCount).toBe(0)
      expect(primary.providerCallCount + fallback.providerCallCount).toBe(1)
    },
  )

  it('keeps an explicitly unsupported-model 404 terminal without fallback', async () => {
    const primary = failingProvider(classifyGeminiFailure({ status: 404, message: 'unsupported model' }, new AbortController().signal))
    const fallback = new FakeAiAdviceProvider({ mode: 'success', advice })
    const service = createAdviceService(primary, immediateTiming(), {}, fallback)

    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: false, kind: 'unavailable' })
    expect(primary.providerCallCount).toBe(1)
    expect(fallback.providerCallCount).toBe(0)
  })

  it('does not fallback invalid provider output or invalid local input', async () => {
    const malformed = new FakeAiAdviceProvider({ mode: 'malformed', malformedOutput: { ...advice, extra: true } })
    const fallback = new FakeAiAdviceProvider({ mode: 'success', advice })
    const service = createAdviceService(malformed, immediateTiming(), {}, fallback)
    await expect(service.requestAdvice(validWonSummary)).resolves.toEqual({ ok: false, kind: 'unavailable' })
    expect(malformed.providerCallCount).toBe(1)
    expect(fallback.providerCallCount).toBe(0)

    await expect(service.requestAdvice({ ...validWonSummary, score: 310 })).resolves.toEqual({ ok: false, kind: 'invalid_summary' })
    expect(malformed.providerCallCount + fallback.providerCallCount).toBe(1)
  })
})


describe('advice service concrete Gemini failure mapping', () => {
  const advice = { summary: 'Reviewed.', recommendation: 'Track the return.', category: 'general' as const }

  it.each([
    ['network', new TypeError('connection reset'), 'transient', 2, 0],
    ['408', { status: 408 }, 'transient', 2, 0],
    ['429', { status: 429 }, 'transient', 2, 0],
    ['404', { status: 404 }, 'provider_unavailable', 1, 1],
    ['500', { status: 500 }, 'provider_unavailable', 1, 1],
    ['502', { status: 502 }, 'provider_unavailable', 1, 1],
    ['503', { status: 503 }, 'provider_unavailable', 1, 1],
    ['400', { status: 400 }, 'permanent', 1, 0],
    ['501', { status: 501 }, 'permanent', 1, 0],
    ['504', { status: 504 }, 'permanent', 1, 0],
    ['401', { status: 401 }, 'auth', 1, 0],
    ['403', { status: 403 }, 'auth', 1, 0],
    ['safety', { status: 400, message: 'safety blocked' }, 'safety', 1, 0],
    ['configuration', { status: 404, message: 'unsupported model' }, 'configuration', 1, 0],
    ['cancellation', new DOMException('aborted', 'AbortError'), 'client_cancelled', 1, 0],
    ['programming', { message: 'unexpected' }, 'programming', 1, 0],
  ] as const)('%s maps to %s and keeps total calls bounded', async (_label, error, kind, expectedPrimaryCalls, expectedFallbackCalls) => {
    const primary = failingProvider(classifyGeminiFailure(error, new AbortController().signal))
    const fallback = new FakeAiAdviceProvider({ mode: 'success', advice })
    const service = createAdviceService(primary, immediateTiming(), {}, fallback)

    await service.requestAdvice(validWonSummary)

    expect(classifyGeminiFailure(error, new AbortController().signal)).toBe(kind)
    expect(primary.providerCallCount).toBe(expectedPrimaryCalls)
    expect(fallback.providerCallCount).toBe(expectedFallbackCalls)
    expect(primary.providerCallCount + fallback.providerCallCount).toBeLessThanOrEqual(2)
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

function failingProvider(kind: ProviderFailureKind) {
  return {
    providerCallCount: 0,
    async generateAdvice() {
      this.providerCallCount += 1
      throw new ProviderFailure(kind)
    },
  }
}
