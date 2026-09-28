export type AiUsageEvent = {
  provider: 'gemini' | 'fake'
  model: string
  timestamp: string
  latencyMs: number
  outcome: 'success' | 'failure' | 'timeout'
  attemptCount: 0 | 1 | 2
}
export type AiUsageSink = (event: AiUsageEvent) => void
export const noOpAiUsageSink: AiUsageSink = () => {}
