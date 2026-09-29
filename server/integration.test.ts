import { describe, expect, it, vi } from 'vitest'
import { createApp, type AppHandler } from './app.js'
import { createAdviceService, type AdviceTiming } from './ai/advice-service.js'
import { FakeAiAdviceProvider } from './ai/fake-provider.js'
import { validWonSummary } from './ai/game-summary-fixtures.js'
import { ProviderFailure, type AiAdviceProvider } from './ai/provider.js'
import { createAdviceTransport, type AdviceTransportResult, type BrowserFetch } from '../src/ai/api-client.js'
import { CoachController, type CoachState } from '../src/ai/coach-controller.js'
import type { AiAdvice } from '../src/ai/contracts.js'
import type { GameSummary } from '../src/ai/contracts.js'

const advice: AiAdvice = {
  summary: 'You cleared every brick.',
  recommendation: 'Track the return sooner.',
  category: 'efficiency',
}

describe('offline browser/backend AI coach integration', () => {
  it('posts the summary through HTTP 200 and renders the validated success state', async () => {
    const provider = new FakeAiAdviceProvider({ mode: 'success', advice })
    const { states, requests, responses } = await requestThroughController(createApp(createAdviceService(provider)))

    expect(provider.providerCallCount).toBe(1)
    expect(requests).toEqual([{
      method: 'POST',
      path: '/api/ai/advice',
      body: JSON.stringify(validWonSummary),
    }])
    expect(responses).toEqual([{ status: 200, body: JSON.stringify(advice) }])
    expect(states.at(-1)).toEqual({ kind: 'success', advice })
  })

  it.each([
    { ...validWonSummary, score: '320' },
    { ...validWonSummary, score: 310 },
  ])('maps representative invalid summary input to exact 400, zero calls, and safe UI failure', async (input) => {
    const provider = new FakeAiAdviceProvider({ mode: 'success', advice })
    const app = createApp(createAdviceService(provider))
    const response = await app({ method: 'POST', path: '/api/ai/advice', body: JSON.stringify(input) })
    expect(response.status).toBe(400)
    expect(response.body).toBe(JSON.stringify({ error: { code: 'INVALID_GAME_SUMMARY', message: 'Invalid game summary.' } }))
    expect(provider.providerCallCount).toBe(0)

    const throughBrowser = await requestThroughController(app, input as typeof validWonSummary)
    expect(throughBrowser.responses).toEqual([{
      status: 400,
      body: JSON.stringify({ error: { code: 'INVALID_GAME_SUMMARY', message: 'Invalid game summary.' } }),
    }])
    expect(throughBrowser.states.at(-1)).toEqual({ kind: 'failure' })
  })

  it('maps a permanent provider failure to one call, exact 503, and safe UI failure', async () => {
    const provider = new FakeAiAdviceProvider({ mode: 'permanentFailure' })
    const app = createApp(createAdviceService(provider, immediateTiming()))
    const throughBrowser = await requestThroughController(app)
    expect(provider.providerCallCount).toBe(1)
    expect(throughBrowser.responses).toEqual([{
      status: 503,
      body: JSON.stringify({ error: { code: 'AI_ADVICE_UNAVAILABLE', message: 'AI advice is temporarily unavailable. Please try again later.' } }),
    }])
    expect(throughBrowser.states.at(-1)).toEqual({ kind: 'failure' })
  })

  it('uses the tested fallback as the second and final call after provider unavailability', async () => {
    const primary = {
      providerCallCount: 0,
      async generateAdvice() {
        this.providerCallCount += 1
        throw new ProviderFailure('provider_unavailable')
      },
    }
    const fallback = new FakeAiAdviceProvider({ mode: 'success', advice })
    const app = createApp(createAdviceService(primary, immediateTiming(), {}, fallback))
    const throughBrowser = await requestThroughController(app)

    expect(primary.providerCallCount).toBe(1)
    expect(fallback.providerCallCount).toBe(1)
    expect(primary.providerCallCount + fallback.providerCallCount).toBe(2)
    expect(throughBrowser.responses).toEqual([{ status: 200, body: JSON.stringify(advice) }])
    expect(throughBrowser.states.at(-1)).toEqual({ kind: 'success', advice })
  })

  it('returns 503 at the shared 15-second deadline and ignores a late provider success', async () => {
    vi.useFakeTimers()
    try {
      let resolveLate: ((value: unknown) => void) | undefined
      const provider: AiAdviceProvider & { calls: number } = {
        calls: 0,
        generateAdvice() {
          this.calls += 1
          return new Promise((resolve) => { resolveLate = resolve })
        },
      }
      const timing: AdviceTiming = { now: () => Date.now(), sleep: async () => {}, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout }
      const app = createApp(createAdviceService(provider, timing))
      const states: CoachState[] = []
      const responses: Array<{ status: number; body: string }> = []
      const controller = new CoachController({ transport: createAdviceTransport(appFetch(app, responses)), onStateChange: (state) => states.push(state) })
      controller.showTerminal(validWonSummary)
      controller.requestAdvice()
      await vi.advanceTimersByTimeAsync(15_000)
      await vi.runAllTimersAsync()
      expect(provider.calls).toBe(1)
      expect(responses).toEqual([{
        status: 503,
        body: JSON.stringify({ error: { code: 'AI_ADVICE_UNAVAILABLE', message: 'AI advice is temporarily unavailable. Please try again later.' } }),
      }])
      expect(controller.state).toEqual({ kind: 'failure' })
      resolveLate?.(advice)
      await waitForSettledState(states)
      expect(controller.state).toEqual({ kind: 'failure' })
      expect(states.at(-1)).toEqual({ kind: 'failure' })
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([
    { summary: 'x', recommendation: 'y', category: 'unknown' },
    { ...advice, extra: true },
    { summary: ' ', recommendation: 'valid', category: 'general' },
  ])('maps malformed provider output to exact 503 without rendering it', async (output) => {
    const provider = new FakeAiAdviceProvider({ mode: 'malformed', malformedOutput: output })
    const app = createApp(createAdviceService(provider, immediateTiming()))
    const response = await app({ method: 'POST', path: '/api/ai/advice', body: JSON.stringify(validWonSummary) })
    expect(response.status).toBe(503)
    const throughBrowser = await requestThroughController(app)
    expect(throughBrowser.responses).toEqual([{
      status: 503,
      body: JSON.stringify({ error: { code: 'AI_ADVICE_UNAVAILABLE', message: 'AI advice is temporarily unavailable. Please try again later.' } }),
    }])
    expect(throughBrowser.states.at(-1)).toEqual({ kind: 'failure' })
    expect(JSON.stringify(throughBrowser.states)).not.toContain('extra')
  })

  it('keeps retries application-owned: transient success uses two calls, twice-transient uses two then 503, non-retryable one', async () => {
    const transientSuccess = new FakeAiAdviceProvider({ mode: 'transientThenSuccess', advice })
    const successApp = createApp(createAdviceService(transientSuccess, immediateTiming()))
    expect((await requestThroughController(successApp)).states.at(-1)).toEqual({ kind: 'success', advice })
    expect(transientSuccess.providerCallCount).toBe(2)

    const twice = new FakeAiAdviceProvider({ mode: 'transientFailure' })
    const twiceApp = createApp(createAdviceService(twice, immediateTiming()))
    expect((await twiceApp({ method: 'POST', path: '/api/ai/advice', body: JSON.stringify(validWonSummary) })).status).toBe(503)
    expect(twice.providerCallCount).toBe(2)

    const permanent = new FakeAiAdviceProvider({ mode: 'permanentFailure' })
    await requestThroughController(createApp(createAdviceService(permanent, immediateTiming())))
    expect(permanent.providerCallCount).toBe(1)
  })

  it.each(['success', 'failure'] as const)('keeps one in-flight fetch and ignores stale %s after restart', async (outcome) => {
    const pending = deferred<AdviceTransportResult>()
    let calls = 0
    let signal: AbortSignal | undefined
    const states: CoachState[] = []
    const controller = new CoachController({
      transport: (_summary: Readonly<GameSummary>, options?: { signal?: AbortSignal }) => { calls += 1; signal = options?.signal; return pending.promise },
      onStateChange: (state) => states.push(state),
    })
    controller.showTerminal(validWonSummary)
    controller.requestAdvice()
    controller.requestAdvice()
    expect(calls).toBe(1)
    controller.restart()
    expect(signal?.aborted).toBe(true)
    pending.resolve(outcome === 'success' ? { ok: true, advice } : { ok: false })
    await waitForSettledState(states)
    expect(controller.state).toEqual({ kind: 'hidden' })
    expect(states.at(-1)).toEqual({ kind: 'hidden' })
  })
})

async function requestThroughController(app: AppHandler, summary = validWonSummary): Promise<{
  states: CoachState[]
  requests: Array<{ method: string; path: string; body: string }>
  responses: Array<{ status: number; body: string }>
}> {
  const states: CoachState[] = []
  const requests: Array<{ method: string; path: string; body: string }> = []
  const responses: Array<{ status: number; body: string }> = []
  const controller = new CoachController({
    transport: createAdviceTransport(appFetch(app, responses, requests)),
    onStateChange: (state) => states.push(state),
  })
  controller.showTerminal(summary)
  controller.requestAdvice()
  await waitForSettledState(states)
  return { states, requests, responses }
}

function appFetch(
  app: AppHandler,
  responses?: Array<{ status: number; body: string }>,
  requests?: Array<{ method: string; path: string; body: string }>,
): BrowserFetch {
  return async (input, init) => {
    const request = { method: init?.method ?? 'GET', path: String(input), body: String(init?.body ?? '') }
    requests?.push(request)
    const response = await app(request)
    responses?.push({ status: response.status, body: response.body })
    return new Response(response.body, { status: response.status, headers: response.headers })
  }
}

function immediateTiming(): AdviceTiming {
  let now = 0
  return { now: () => now, sleep: async (milliseconds) => { now += milliseconds }, setTimeout, clearTimeout }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve })
  return { promise, resolve }
}

async function waitForSettledState(states: readonly CoachState[]): Promise<void> {
  for (let turn = 0; turn < 100; turn += 1) {
    const kind = states.at(-1)?.kind
    if (kind === 'success' || kind === 'failure' || kind === 'hidden') return
    await new Promise<void>((resolve) => setImmediate(resolve))
  }
  throw new Error(`Coach controller did not settle after 100 event-loop turns; last state: ${states.at(-1)?.kind ?? 'none'}`)
}
