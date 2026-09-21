import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import {
  BALL_RADIUS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  PADDLE_WIDTH,
  createGame,
  updateGame,
} from './game'

describe('game creation and control', () => {
  it('creates the fixed READY game', () => {
    const result = createGame(DEFAULT_CONFIG)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.status).toBe('READY')
    expect(result.state.score).toBe(0)
    expect(result.state.lives).toBe(3)
    expect(result.state.bricks).toHaveLength(32)
    expect(result.state.bricks.every((brick) => brick.alive)).toBe(true)
    expect(result.state.ball.vx).toBe(0)
    expect(result.state.ball.vy).toBe(0)
    expect(result.state.ball.y).toBe(
      result.state.paddle.y - result.state.ball.radius - 2,
    )
  })

  it('rejects invalid configuration before creating state', () => {
    expect(createGame({ lives: 3, paddleSpeed: 360 })).toMatchObject({
      ok: false,
    })
  })

  it('starts with a deterministic upward velocity at configured speed', () => {
    const state = readyState()

    updateGame(state, { move: 0, start: true }, 0)

    expect(state.status).toBe('RUNNING')
    expect(Math.hypot(state.ball.vx, state.ball.vy)).toBeCloseTo(
      DEFAULT_CONFIG.ballSpeed,
    )
    expect(state.ball.vx).toBeGreaterThan(0)
    expect(state.ball.vy).toBeLessThan(0)
  })

  it('moves and clamps the paddle while keeping the READY ball attached', () => {
    const state = readyState()
    const initialBallOffset = state.ball.x - state.paddle.x

    updateGame(state, { move: -1, start: false }, 10)
    expect(state.paddle.x).toBe(0)
    expect(state.ball.x - state.paddle.x).toBe(initialBallOffset)

    updateGame(state, { move: 1, start: false }, 10)
    expect(state.paddle.x).toBe(FIELD_WIDTH - PADDLE_WIDTH)
    expect(state.ball.x - state.paddle.x).toBe(initialBallOffset)
  })
})

describe('collisions and scoring', () => {
  it('reflects from the left, right, and top walls', () => {
    const left = runningState()
    left.ball.x = BALL_RADIUS + 1
    left.ball.vx = -100
    left.ball.vy = -50
    updateGame(left, idleInput, 0.02)
    expect(left.ball.x).toBe(BALL_RADIUS)
    expect(left.ball.vx).toBe(100)

    const right = runningState()
    right.ball.x = FIELD_WIDTH - BALL_RADIUS - 1
    right.ball.vx = 100
    right.ball.vy = -50
    updateGame(right, idleInput, 0.02)
    expect(right.ball.x).toBe(FIELD_WIDTH - BALL_RADIUS)
    expect(right.ball.vx).toBe(-100)

    const top = runningState()
    top.ball.y = BALL_RADIUS + 1
    top.ball.vx = 50
    top.ball.vy = -100
    updateGame(top, idleInput, 0.02)
    expect(top.ball.y).toBe(BALL_RADIUS)
    expect(top.ball.vy).toBe(100)
  })

  it('reflects the ball upward from the paddle', () => {
    const state = runningState()
    state.ball.x = state.paddle.x + state.paddle.width / 2
    state.ball.y = state.paddle.y - BALL_RADIUS - 1
    state.ball.vx = 30
    state.ball.vy = 100

    updateGame(state, idleInput, 0.02)

    expect(state.ball.y).toBe(state.paddle.y - BALL_RADIUS)
    expect(state.ball.vy).toBe(-100)
  })

  it('removes and scores a brick once with top/bottom response', () => {
    const state = runningState()
    const brick = state.bricks[0]
    state.ball.x = brick.x + brick.width / 2
    state.ball.y = brick.y - BALL_RADIUS - 1
    state.ball.vx = 0
    state.ball.vy = 100

    updateGame(state, idleInput, 0.02)

    expect(brick.alive).toBe(false)
    expect(state.score).toBe(10)
    expect(state.ball.vy).toBe(-100)

    updateGame(state, idleInput, 0)
    expect(state.score).toBe(10)
  })

  it('uses horizontal response for a brick side hit', () => {
    const state = runningState()
    const brick = state.bricks[0]
    state.ball.x = brick.x - BALL_RADIUS - 1
    state.ball.y = brick.y + brick.height / 2
    state.ball.vx = 100
    state.ball.vy = 0

    updateGame(state, idleInput, 0.02)

    expect(brick.alive).toBe(false)
    expect(state.score).toBe(10)
    expect(state.ball.vx).toBe(-100)
  })
})

describe('life and terminal transitions', () => {
  it('loses one life and resets to READY while preserving progress', () => {
    const state = runningState()
    state.score = 20
    state.bricks[0].alive = false
    state.ball.y = FIELD_HEIGHT + BALL_RADIUS
    state.ball.vy = 100

    updateGame(state, idleInput, 0)

    expect(state.status).toBe('READY')
    expect(state.lives).toBe(2)
    expect(state.score).toBe(20)
    expect(state.bricks[0].alive).toBe(false)
    expect(state.ball.vx).toBe(0)
    expect(state.ball.vy).toBe(0)
  })

  it('enters GAME_OVER on the final missed ball', () => {
    const state = runningState()
    state.lives = 1
    state.ball.y = FIELD_HEIGHT + BALL_RADIUS

    updateGame(state, idleInput, 0)

    expect(state.lives).toBe(0)
    expect(state.status).toBe('GAME_OVER')
  })

  it('enters WON when the final brick is destroyed', () => {
    const state = runningState()
    state.bricks.forEach((brick) => {
      brick.alive = false
    })
    const brick = state.bricks[0]
    brick.alive = true
    state.ball.x = brick.x + brick.width / 2
    state.ball.y = brick.y - BALL_RADIUS - 1
    state.ball.vx = 0
    state.ball.vy = 100

    updateGame(state, idleInput, 0.02)

    expect(state.status).toBe('WON')
    expect(state.score).toBe(10)
  })

  it('stops terminal simulation and restarts a fresh game with start input', () => {
    const state = runningState()
    state.status = 'WON'
    state.score = 320
    state.bricks.forEach((brick) => {
      brick.alive = false
    })
    const frozenBall = { ...state.ball }

    updateGame(state, idleInput, 1)
    expect(state.ball).toEqual(frozenBall)

    updateGame(state, { move: 0, start: true }, 0)
    expect(state.status).toBe('READY')
    expect(state.score).toBe(0)
    expect(state.lives).toBe(3)
    expect(state.bricks.every((brick) => brick.alive)).toBe(true)
  })
})

const idleInput = { move: 0 as const, start: false }

function readyState() {
  const result = createGame(DEFAULT_CONFIG)
  if (!result.ok) throw new Error(result.error)
  return result.state
}

function runningState() {
  const state = readyState()
  updateGame(state, { move: 0, start: true }, 0)
  return state
}
