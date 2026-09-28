import type { AiAdvice, GameSummary } from './contracts.js'
import { ProviderFailure, type AiAdviceProvider } from './provider.js'

export type FakeProviderMode =
  | 'success'
  | 'permanentFailure'
  | 'transientFailure'
  | 'transientThenSuccess'
  | 'delayed'
  | 'malformed'

const DEFAULT_ADVICE: AiAdvice = {
  summary: 'Your completed game has been reviewed.',
  recommendation: 'Track the ball early and center the paddle before contact.',
  category: 'general',
}

export class FakeAiAdviceProvider implements AiAdviceProvider {
  providerCallCount = 0
  private readonly mode: FakeProviderMode
  private readonly advice: AiAdvice
  private readonly malformedOutput: unknown

  constructor(options: {
    mode: FakeProviderMode
    advice?: AiAdvice
    malformedOutput?: unknown
  }) {
    this.mode = options.mode
    this.advice = options.advice ?? DEFAULT_ADVICE
    this.malformedOutput = options.malformedOutput
  }

  generateAdvice(
    _summary: Readonly<GameSummary>,
    { signal }: { signal: AbortSignal },
  ): Promise<unknown> {
    this.providerCallCount += 1

    if (this.mode === 'permanentFailure') {
      return Promise.reject(new ProviderFailure('permanent'))
    }
    if (this.mode === 'transientFailure') {
      return Promise.reject(new ProviderFailure('transient'))
    }
    if (
      this.mode === 'transientThenSuccess' &&
      this.providerCallCount === 1
    ) {
      return Promise.reject(new ProviderFailure('transient'))
    }
    if (this.mode === 'malformed') {
      return Promise.resolve(this.malformedOutput)
    }
    if (this.mode === 'delayed') {
      return new Promise((_, reject) => {
        const abort = () => reject(new ProviderFailure('client_cancelled'))
        if (signal.aborted) {
          abort()
          return
        }
        signal.addEventListener('abort', abort, { once: true })
      })
    }
    return Promise.resolve(this.advice)
  }
}
