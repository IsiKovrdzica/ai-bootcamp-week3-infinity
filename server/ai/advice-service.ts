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
const DEADLINE_MS = 15_000
const RETRY_DELAY_MS = 250

export function createAdviceService(provider: AiAdviceProvider, timing: AdviceTiming = defaultTiming, diagnostics: { usageSink?: import('./usage-log.js').AiUsageSink; provider?: 'fake' | 'gemini'; model?: string } = {}): AdviceService {
  const sink = diagnostics.usageSink ?? (() => {})
  const emit = (outcome: 'success' | 'failure' | 'timeout', attemptCount: 0 | 1 | 2, started: number) => sink({ provider: diagnostics.provider ?? 'fake', model: diagnostics.model ?? 'fake', timestamp: new Date(started).toISOString(), latencyMs: Math.max(0, timing.now() - started), outcome, attemptCount })
  return { async requestAdvice(input) {
    const started = timing.now()
    let emitted = false
    const finish = (outcome: 'success' | 'failure' | 'timeout', attemptCount: 0 | 1 | 2, result: AdviceServiceResult) => {
      if (!emitted) {
        emitted = true
        emit(outcome, attemptCount, started)
      }
      return result
    }
    const validated = validateGameSummary(input)
    if (!validated.ok) return finish('failure', 0, { ok: false, kind: 'invalid_summary' })
    let attemptCount: 0 | 1 | 2 = 0
    const controller = new AbortController()
    const deadline = timing.now() + DEADLINE_MS
    let expired = false
    let expire: (() => void) | undefined
    const deadlineResult = Symbol('deadline')
    const deadlinePromise = new Promise<typeof deadlineResult>((resolve) => { expire = () => resolve(deadlineResult) })
    const timer = timing.setTimeout(() => { expired = true; controller.abort(); expire?.() }, DEADLINE_MS)
    try {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        if (expired || timing.now() >= deadline) return finish('timeout', attemptCount, { ok: false, kind: 'unavailable' })
        try {
          attemptCount = attempt as 1 | 2
          const output: unknown | typeof deadlineResult = await Promise.race([
            provider.generateAdvice(validated.value, { signal: controller.signal }),
            deadlinePromise,
          ])
          if (output === deadlineResult || expired) return finish('timeout', attemptCount, { ok: false, kind: 'unavailable' })
          const advice = validateAiAdvice(output)
          if (!advice.ok) return finish('failure', attemptCount, { ok: false, kind: 'unavailable' })
          const { summary, recommendation, category } = advice.value
          return finish('success', attemptCount, { ok: true, advice: { summary, recommendation, category } })
        } catch (error) {
          if (expired || timing.now() >= deadline) return finish('timeout', attemptCount, { ok: false, kind: 'unavailable' })
          if (!(error instanceof ProviderFailure) || error.kind !== 'transient' || attempt === 2) return finish('failure', attemptCount, { ok: false, kind: 'unavailable' })
          if (deadline - timing.now() < RETRY_DELAY_MS) return finish('failure', attemptCount, { ok: false, kind: 'unavailable' })
          try { await timing.sleep(RETRY_DELAY_MS, controller.signal) } catch {
            return finish(expired || timing.now() >= deadline ? 'timeout' : 'failure', attemptCount, { ok: false, kind: 'unavailable' })
          }
        }
      }
      return finish('failure', attemptCount, { ok: false, kind: 'unavailable' })
    } finally { timing.clearTimeout(timer) }
  } }
}
export type ValidatedSummary = Readonly<GameSummary>
