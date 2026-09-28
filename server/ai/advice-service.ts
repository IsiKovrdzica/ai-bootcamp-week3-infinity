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

export function createAdviceService(provider: AiAdviceProvider, timing: AdviceTiming = defaultTiming): AdviceService {
  return { async requestAdvice(input) {
    const validated = validateGameSummary(input)
    if (!validated.ok) return { ok: false, kind: 'invalid_summary' }
    const controller = new AbortController()
    const deadline = timing.now() + DEADLINE_MS
    let expired = false
    let expire: (() => void) | undefined
    const deadlineResult = Symbol('deadline')
    const deadlinePromise = new Promise<typeof deadlineResult>((resolve) => { expire = () => resolve(deadlineResult) })
    const timer = timing.setTimeout(() => { expired = true; controller.abort(); expire?.() }, DEADLINE_MS)
    try {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        if (expired || timing.now() >= deadline) return { ok: false, kind: 'unavailable' }
        try {
          const output: unknown | typeof deadlineResult = await Promise.race([
            provider.generateAdvice(validated.value, { signal: controller.signal }),
            deadlinePromise,
          ])
          if (output === deadlineResult || expired) return { ok: false, kind: 'unavailable' }
          const advice = validateAiAdvice(output)
          if (!advice.ok) return { ok: false, kind: 'unavailable' }
          const { summary, recommendation, category } = advice.value
          return { ok: true, advice: { summary, recommendation, category } }
        } catch (error) {
          if (!(error instanceof ProviderFailure) || error.kind !== 'transient' || attempt === 2) return { ok: false, kind: 'unavailable' }
          if (deadline - timing.now() < RETRY_DELAY_MS) return { ok: false, kind: 'unavailable' }
          try { await timing.sleep(RETRY_DELAY_MS, controller.signal) } catch { return { ok: false, kind: 'unavailable' } }
        }
      }
      return { ok: false, kind: 'unavailable' }
    } finally { timing.clearTimeout(timer) }
  } }
}
export type ValidatedSummary = Readonly<GameSummary>
