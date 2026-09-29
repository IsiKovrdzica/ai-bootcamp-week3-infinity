import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../config'
import { createGame, type GameState } from '../game'
import { deriveGameSummary } from './game-summary'

describe('terminal GameSummary derivation', () => {
  it('derives exact WON outcome, score, destroyed bricks, lives, and duration without GameState leakage', () => {
    const state = freshState()
    state.status = 'WON'
    state.score = 320
    state.lives = 2
    state.durationSeconds = 42.5
    state.bricks.forEach((brick) => {
      brick.alive = false
    })

    const summary = deriveGameSummary(state)

    expect(summary).toEqual({
      outcome: 'WON',
      score: 320,
      bricksDestroyed: 32,
      livesRemaining: 2,
      livesLost: 1,
      durationSeconds: 42.5,
    })
    expect(Object.keys(summary ?? {}).sort()).toEqual([
      'bricksDestroyed',
      'durationSeconds',
      'livesLost',
      'livesRemaining',
      'outcome',
      'score',
    ])
  })

  it('derives exact GAME_OVER values from existing score, bricks, lives, config, status, and duration', () => {
    const state = freshState()
    state.status = 'GAME_OVER'
    state.score = 40
    state.lives = 0
    state.durationSeconds = 18.25
    state.bricks.slice(0, 4).forEach((brick) => {
      brick.alive = false
    })

    expect(deriveGameSummary(state)).toEqual({
      outcome: 'GAME_OVER',
      score: 40,
      bricksDestroyed: 4,
      livesRemaining: 0,
      livesLost: 3,
      durationSeconds: 18.25,
    })
  })

  it.each(['READY', 'RUNNING'] as const)(
    'rejects non-terminal %s state',
    (status) => {
      const state = freshState()
      state.status = status

      expect(deriveGameSummary(state)).toBeNull()
    },
  )
})

function freshState(): GameState {
  const result = createGame(DEFAULT_CONFIG)
  if (!result.ok) throw new Error(result.error)
  return result.state
}
