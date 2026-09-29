import type { AiAdvice, GameSummary } from './contracts.js'

export type BrowserFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export type AdviceTransportResult =
  | { ok: true; advice: AiAdvice }
  | { ok: false }

export type AdviceTransport = (
  summary: Readonly<GameSummary>,
  options?: { signal?: AbortSignal },
) => Promise<AdviceTransportResult>

export function createAdviceTransport(fetch: BrowserFetch): AdviceTransport {
  return async (summary, options) => {
    try {
      const response = await fetch('/api/ai/advice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(summary),
        signal: options?.signal,
      })
      if (response.status !== 200) return { ok: false }

      const payload: unknown = await response.json()
      if (!isAiAdvice(payload)) return { ok: false }
      return { ok: true, advice: payload }
    } catch {
      return { ok: false }
    }
  }
}

function isAiAdvice(value: unknown): value is AiAdvice {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) return false

  const candidate = value as Record<string, unknown>
  const keys = Object.keys(candidate).sort()
  if (keys.length !== 3 || keys.join(',') !== 'category,recommendation,summary') {
    return false
  }

  return (
    isNonBlankString(candidate.summary, 160) &&
    isNonBlankString(candidate.recommendation, 220) &&
    (candidate.category === 'survival' ||
      candidate.category === 'efficiency' ||
      candidate.category === 'consistency' ||
      candidate.category === 'general')
  )
}

function isNonBlankString(value: unknown, maximumLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maximumLength
  )
}
