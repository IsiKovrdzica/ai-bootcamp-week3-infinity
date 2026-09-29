import type { ProviderFailureKind } from './provider.js'

export type AiDiagnosticFailureKind = ProviderFailureKind | 'timeout'

export type AiUsageEvent = {
  provider: 'gemini' | 'fake'
  model: string
  timestamp: string
  latencyMs: number
  outcome: 'success' | 'failure' | 'timeout'
  attemptCount: 1 | 2
  attemptKind: 'initial' | 'retry' | 'fallback'
  failureKind?: AiDiagnosticFailureKind
  tokenUsage?: { input?: number; output?: number }
}
export type AiUsageSink = (event: AiUsageEvent) => void
export const noOpAiUsageSink: AiUsageSink = () => {}
