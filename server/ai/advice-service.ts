import type { AiAdvice, GameSummary } from './contracts.js'
import { ProviderFailure, type AiAdviceProvider } from './provider.js'
import { validateAiAdvice, validateGameSummary } from './validation.js'

export type AdviceServiceResult = | { ok: true; advice: AiAdvice } | { ok: false; kind: 'invalid_summary' | 'unavailable' }
export type AdviceTiming = {
  now: () => number
  sleep: (milliseconds: number, signal: AbortSignal) => Promise<void>
  setTimeout: (callback: () => void, milliseconds: number) => ReturnType<typeof setTimeout>
  clearTimeout: (timer: ReturnType<typeof setTimeout>) => void
}
const defaultTiming: AdviceTiming = {
  now: () => Date.now(),
  sleep: (milliseconds, signal) => new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds)
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('aborted')) }, { once: true })
  }),
  setTimeout,
  clearTimeout,
}
export type AdviceService = { requestAdvice(input: unknown): Promise<AdviceServiceResult> }
export type AdviceDiagnostics = {
  usageSink?: import('./usage-log.js').AiUsageSink
  provider?: 'fake' | 'gemini'
  model?: string
  fallbackModel?: string
}
const DEADLINE_MS = 15_000
const RETRY_DELAY_MS = 250

export function createAdviceService(
  provider: AiAdviceProvider,
  timing: AdviceTiming = defaultTiming,
  diagnostics: AdviceDiagnostics = {},
  fallbackProvider?: AiAdviceProvider,
): AdviceService {
  const sink = diagnostics.usageSink ?? (() => {})
  return { async requestAdvice(input) {
    const validated = validateGameSummary(input)
    if (!validated.ok) return { ok: false, kind: 'invalid_summary' }

    let selectedProvider = provider
    let selectedAttemptKind: import('./usage-log.js').AiUsageEvent['attemptKind'] = 'initial'
    let selectedModel = diagnostics.model ?? 'fake'
    const controller = new AbortController()
    const deadline = timing.now() + DEADLINE_MS
    let expired = false
    let expire: (() => void) | undefined
    const deadlineResult = Symbol('deadline')
    const deadlinePromise = new Promise<typeof deadlineResult>((resolve) => { expire = () => resolve(deadlineResult) })
    const timer = timing.setTimeout(() => { expired = true; controller.abort(); expire?.() }, DEADLINE_MS)
    const emitAttempt = (
      outcome: import('./usage-log.js').AiUsageEvent['outcome'],
      attemptCount: 1 | 2,
      started: number,
    ) => sink({
      provider: diagnostics.provider ?? 'fake',
      model: selectedModel,
      timestamp: new Date(started).toISOString(),
      latencyMs: Math.max(0, timing.now() - started),
      outcome,
      attemptCount,
      attemptKind: selectedAttemptKind,
    })

    try {
      for (let attempt = 1 as 1 | 2; attempt <= 2; attempt = (attempt + 1) as 1 | 2) {
        if (expired || timing.now() >= deadline) return { ok: false, kind: 'unavailable' }
        const attemptStarted = timing.now()
        try {
          const output: unknown | typeof deadlineResult = await Promise.race([
            selectedProvider.generateAdvice(validated.value, { signal: controller.signal }),
            deadlinePromise,
          ])
          if (output === deadlineResult || expired) {
            emitAttempt('timeout', attempt, attemptStarted)
            return { ok: false, kind: 'unavailable' }
          }
          const advice = validateAiAdvice(output)
          if (!advice.ok) {
            emitAttempt('failure', attempt, attemptStarted)
            return { ok: false, kind: 'unavailable' }
          }
          const { summary, recommendation, category } = advice.value
          emitAttempt('success', attempt, attemptStarted)
          return { ok: true, advice: { summary, recommendation, category } }
        } catch (error) {
          if (expired || timing.now() >= deadline) {
            emitAttempt('timeout', attempt, attemptStarted)
            return { ok: false, kind: 'unavailable' }
          }
          emitAttempt('failure', attempt, attemptStarted)
          const useFallback = error instanceof ProviderFailure && error.kind === 'provider_unavailable'
          const retryPrimary = error instanceof ProviderFailure && error.kind === 'transient'
          if ((!retryPrimary && !useFallback) || attempt === 2 || (useFallback && !fallbackProvider)) {
            return { ok: false, kind: 'unavailable' }
          }
          if (deadline - timing.now() < RETRY_DELAY_MS) return { ok: false, kind: 'unavailable' }
          try { await timing.sleep(RETRY_DELAY_MS, controller.signal) } catch {
            return { ok: false, kind: 'unavailable' }
          }
          if (expired || timing.now() >= deadline) return { ok: false, kind: 'unavailable' }
          if (useFallback && fallbackProvider) {
            selectedProvider = fallbackProvider
            selectedAttemptKind = 'fallback'
            selectedModel = diagnostics.fallbackModel ?? selectedModel
          } else {
            selectedAttemptKind = 'retry'
          }
        }
      }
      return { ok: false, kind: 'unavailable' }
    } finally { timing.clearTimeout(timer) }
  } }
}
export type ValidatedSummary = Readonly<GameSummary>
