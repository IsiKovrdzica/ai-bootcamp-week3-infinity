import { describe, expect, it } from 'vitest'
import {
  CoachController,
  type CoachState,
} from './coach-controller'
import type { AdviceTransport, AdviceTransportResult } from './api-client'
import type { AiAdvice, GameSummary } from './contracts'

const summary: GameSummary = {
  outcome: 'GAME_OVER',
  score: 40,
  bricksDestroyed: 4,
  livesRemaining: 0,
  livesLost: 3,
  durationSeconds: 18.25,
}

const advice: AiAdvice = {
  summary: 'You kept the rally going.',
  recommendation: 'Return to paddle center sooner.',
  category: 'survival',
}

describe('CoachController', () => {
  it('moves hidden to idle to synchronous pending to success and allows another explicit request after settle', async () => {
    const states: CoachState[] = []
    const first = deferred<AdviceTransportResult>()
    const second = deferred<AdviceTransportResult>()
    const requests: AbortSignal[] = []
    let callCount = 0
    let controller: CoachController
    const transport: AdviceTransport = (_summary, options) => {
      requests.push(options?.signal as AbortSignal)
      expect(controller.state.kind).toBe('pending')
      callCount += 1
      return callCount === 1 ? first.promise : second.promise
    }
    controller = new CoachController({ transport, onStateChange: (state) => states.push(state) })

    expect(controller.state).toEqual({ kind: 'hidden' })
    controller.showTerminal(summary)
    expect(controller.state).toEqual({ kind: 'idle' })
    controller.requestAdvice()
    expect(controller.state).toEqual({ kind: 'pending' })
    expect(requests).toHaveLength(1)

    first.resolve({ ok: true, advice })
    await settle()
    expect(controller.state).toEqual({ kind: 'success', advice })

    controller.requestAdvice()
    expect(controller.state).toEqual({ kind: 'pending' })
    expect(requests).toHaveLength(2)
    second.resolve({ ok: true, advice })
    await settle()
    expect(states.map((state) => state.kind)).toEqual([
      'hidden', 'idle', 'pending', 'success', 'pending', 'success',
    ])
  })

  it('moves hidden to idle to pending to failure for a safe transport failure', async () => {
    const states: CoachState[] = []
    const pending = deferred<AdviceTransportResult>()
    const controller = new CoachController({
      transport: () => pending.promise,
      onStateChange: (state) => states.push(state),
    })

    controller.showTerminal(summary)
    controller.requestAdvice()
    expect(controller.state).toEqual({ kind: 'pending' })
    pending.resolve({ ok: false })
    await settle()

    expect(controller.state).toEqual({ kind: 'failure' })
    expect(states.map((state) => state.kind)).toEqual([
      'hidden', 'idle', 'pending', 'failure',
    ])
  })

  it('ignores a second request while one request is pending', () => {
    const pending = deferred<AdviceTransportResult>()
    let callCount = 0
    const controller = new CoachController({
      transport: () => {
        callCount += 1
        return pending.promise
      },
      onStateChange: () => {},
    })

    controller.showTerminal(summary)
    controller.requestAdvice()
    controller.requestAdvice()

    expect(callCount).toBe(1)
    expect(controller.state).toEqual({ kind: 'pending' })
  })

  it.each(['success', 'failure'] as const)(
    'aborts, clears, advances session, and ignores late %s from a restarted game',
    async (lateResult) => {
      const states: CoachState[] = []
      const pending = deferred<AdviceTransportResult>()
      let signal: AbortSignal | undefined
      const controller = new CoachController({
        transport: (_summary, options) => {
          signal = options?.signal
          return pending.promise
        },
        onStateChange: (state) => states.push(state),
      })

      controller.showTerminal(summary)
      const sessionBeforeRequest = controller.sessionId
      controller.requestAdvice()
      controller.restart()

      expect(signal?.aborted).toBe(true)
      expect(controller.state).toEqual({ kind: 'hidden' })
      expect(controller.sessionId).toBe(sessionBeforeRequest + 1)

      pending.resolve(lateResult === 'success' ? { ok: true, advice } : { ok: false })
      await settle()

      expect(controller.state).toEqual({ kind: 'hidden' })
      expect(states.map((state) => state.kind)).toEqual(['hidden', 'idle', 'pending', 'hidden'])
    },
  )
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

async function settle(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}
