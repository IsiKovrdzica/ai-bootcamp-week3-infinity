import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../src/config'
import { FIELD_HEIGHT, createGame, updateGame } from '../src/game'

describe('BrickPulse Week 3 independent holdout', () => {
  it('H1 - final miss, terminal stability, and fresh restart', () => {
    const referenceCreation = createGame(DEFAULT_CONFIG)
    if (!referenceCreation.ok) throw new Error(referenceCreation.error)
    const reference = referenceCreation.state

    const testCreation = createGame(DEFAULT_CONFIG)
    if (!testCreation.ok) throw new Error(testCreation.error)
    const state = testCreation.state

    updateGame(state, { move: 0, start: true }, 0)
    state.lives = 1
    state.ball.x = state.ball.radius
    state.ball.y = FIELD_HEIGHT - state.ball.radius - 1
    state.ball.vx = 0
    state.ball.vy = DEFAULT_CONFIG.ballSpeed

    const preMissScore = state.score
    const preMissBricks = state.bricks.map((brick) => brick.alive)

    updateGame(state, { move: 0, start: false }, 0.1)

    expect(state.status).toBe('GAME_OVER')
    expect(state.score).toBe(preMissScore)
    expect(state.bricks.map((brick) => brick.alive)).toEqual(preMissBricks)

    const terminalBallPosition = { x: state.ball.x, y: state.ball.y }
    const terminalScore = state.score
    const terminalBricks = state.bricks.map((brick) => brick.alive)

    updateGame(state, { move: 0, start: false }, 1)

    expect(state.status).toBe('GAME_OVER')
    expect(state.ball.x).toBe(terminalBallPosition.x)
    expect(state.ball.y).toBe(terminalBallPosition.y)
    expect(state.score).toBe(terminalScore)
    expect(state.bricks.map((brick) => brick.alive)).toEqual(terminalBricks)

    updateGame(state, { move: 0, start: true }, 0)

    expect(state.status).toBe('READY')
    expect(state.lives).toBe(3)
    expect(state.score).toBe(0)
    expect(state.bricks).toHaveLength(32)
    expect(state.bricks.every((brick) => brick.alive)).toBe(true)
    expect(state.paddle.x).toBe(reference.paddle.x)
    expect(state.paddle.y).toBe(reference.paddle.y)
    expect(state.ball.x).toBe(reference.ball.x)
    expect(state.ball.y).toBe(reference.ball.y)
  })
})
