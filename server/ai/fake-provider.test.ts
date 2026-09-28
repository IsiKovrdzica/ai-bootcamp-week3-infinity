import { describe, expect, it } from 'vitest'
import { FakeAiAdviceProvider } from './fake-provider.js'
import { ProviderFailure } from './provider.js'

const summary = {
  outcome: 'WON' as const,
  score: 320,
  bricksDestroyed: 32,
  livesRemaining: 3,
  livesLost: 0,
  durationSeconds: 12,
}

const advice = {
  summary: 'You cleared every brick.',
  recommendation: 'Track the ball before it reaches the paddle.',
  category: 'consistency' as const,
}

describe('FakeAiAdviceProvider', () => {
  it('returns deterministic success and increments before resolution', async () => {
    const provider = new FakeAiAdviceProvider({ mode: 'success', advice })
    const pending = provider.generateAdvice(summary, {
      signal: new AbortController().signal,
    })

    expect(provider.providerCallCount).toBe(1)
    await expect(pending).resolves.toEqual(advice)
  })

  it('models permanent, transient, and transient-then-success failures', async () => {
    const permanent = new FakeAiAdviceProvider({ mode: 'permanentFailure' })
    await expect(
      permanent.generateAdvice(summary, { signal: new AbortController().signal }),
    ).rejects.toMatchObject({ kind: 'permanent' } satisfies Partial<ProviderFailure>)

    const transient = new FakeAiAdviceProvider({ mode: 'transientFailure' })
    await expect(
      transient.generateAdvice(summary, { signal: new AbortController().signal }),
    ).rejects.toMatchObject({ kind: 'transient' } satisfies Partial<ProviderFailure>)

    const thenSuccess = new FakeAiAdviceProvider({
      mode: 'transientThenSuccess',
      advice,
    })
    await expect(
      thenSuccess.generateAdvice(summary, { signal: new AbortController().signal }),
    ).rejects.toMatchObject({ kind: 'transient' } satisfies Partial<ProviderFailure>)
    await expect(
      thenSuccess.generateAdvice(summary, { signal: new AbortController().signal }),
    ).resolves.toEqual(advice)
    expect(thenSuccess.providerCallCount).toBe(2)
  })

  it('can be delayed, observes abort, and returns arbitrary malformed unknown output', async () => {
    const delayed = new FakeAiAdviceProvider({ mode: 'delayed' })
    const controller = new AbortController()
    const pending = delayed.generateAdvice(summary, { signal: controller.signal })
    expect(delayed.providerCallCount).toBe(1)
    controller.abort()
    await expect(pending).rejects.toMatchObject({
      kind: 'client_cancelled',
    } satisfies Partial<ProviderFailure>)

    const malformed = { summary: 'valid', recommendation: 'valid', extra: true }
    const provider = new FakeAiAdviceProvider({
      mode: 'malformed',
      malformedOutput: malformed,
    })
    await expect(
      provider.generateAdvice(summary, { signal: new AbortController().signal }),
    ).resolves.toBe(malformed)
  })
})
