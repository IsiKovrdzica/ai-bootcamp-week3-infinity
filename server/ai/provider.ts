import type { GameSummary } from './contracts.js'

export type ProviderFailureKind =
  | 'transient'
  | 'auth'
  | 'configuration'
  | 'safety'
  | 'client_cancelled'
  | 'permanent'
  | 'programming'

export class ProviderFailure extends Error {
  constructor(readonly kind: ProviderFailureKind) {
    super(kind)
  }
}

export interface AiAdviceProvider {
  generateAdvice(
    summary: Readonly<GameSummary>,
    options: { signal: AbortSignal },
  ): Promise<unknown>
}
