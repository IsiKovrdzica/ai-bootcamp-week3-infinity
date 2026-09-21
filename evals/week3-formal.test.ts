import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, validateGameConfig } from '../src/config'
import { FIELD_WIDTH, createGame, updateGame } from '../src/game'

describe('BrickPulse Week 3 formal baseline evaluations', () => {
  it('E1 - starts normally from READY', () => {
    const creation = createGame(DEFAULT_CONFIG)
    expect(creation.ok).toBe(true)
    if (!creation.ok) return

    const state = creation.state
    expect(state.status).toBe('READY')

    updateGame(state, { move: 0, start: true }, 0)

    expect(state.status).toBe('RUNNING')
    expect(Math.hypot(state.ball.vx, state.ball.vy)).toBeGreaterThan(0)

    const positionAfterStart = { x: state.ball.x, y: state.ball.y }
    updateGame(state, { move: 0, start: false }, 1 / 60)

    expect({ x: state.ball.x, y: state.ball.y }).not.toEqual(positionAfterStart)
    expect(state.score).toBe(0)
    expect(state.lives).toBe(3)
    expect(state.bricks.filter((brick) => brick.alive)).toHaveLength(32)
  })

  it('E2 - keeps sustained paddle movement inside both boundaries', () => {
    const leftState = createReadyState()
    updateGame(leftState, { move: -1, start: false }, 10)

    expect(leftState.paddle.x).toBe(0)
    expect(leftState.paddle.x).toBeGreaterThanOrEqual(0)
    expect(leftState.paddle.x + leftState.paddle.width).toBeLessThanOrEqual(
      FIELD_WIDTH,
    )

    const leftBoundaryPosition = leftState.paddle.x
    updateGame(leftState, { move: -1, start: false }, 10)
    expect(leftState.paddle.x).toBe(leftBoundaryPosition)
    expect(leftState.paddle.x).toBeGreaterThanOrEqual(0)
    expect(leftState.paddle.x + leftState.paddle.width).toBeLessThanOrEqual(
      FIELD_WIDTH,
    )

    const rightState = createReadyState()
    updateGame(rightState, { move: 1, start: false }, 10)

    expect(rightState.paddle.x + rightState.paddle.width).toBe(FIELD_WIDTH)
    expect(rightState.paddle.x).toBeGreaterThanOrEqual(0)
    expect(rightState.paddle.x + rightState.paddle.width).toBeLessThanOrEqual(
      FIELD_WIDTH,
    )

    const rightBoundaryPosition = rightState.paddle.x
    updateGame(rightState, { move: 1, start: false }, 10)
    expect(rightState.paddle.x).toBe(rightBoundaryPosition)
    expect(rightState.paddle.x).toBeGreaterThanOrEqual(0)
    expect(rightState.paddle.x + rightState.paddle.width).toBeLessThanOrEqual(
      FIELD_WIDTH,
    )
  })

  it('E3 - rejects every invalid or incomplete configuration variant', () => {
    const variants: unknown[] = [
      { lives: 3, paddleSpeed: 360 },
      { lives: 0, paddleSpeed: 360, ballSpeed: 240 },
      { lives: 3, paddleSpeed: '360', ballSpeed: 240 },
      {
        lives: 3,
        paddleSpeed: 360,
        ballSpeed: 240,
        unexpected: true,
      },
    ]

    for (const variant of variants) {
      expect(validateGameConfig(variant).ok).toBe(false)

      const creation = createGame(variant)
      expect(creation.ok).toBe(false)
      expect(creation).not.toHaveProperty('state')
    }
  })

  it('E4 - removes and scores one brick once on a side collision', () => {
    const state = createRunningState()
    const target = state.bricks[0]
    const otherBricks = state.bricks.slice(1)
    const initialAliveCount = state.bricks.filter((brick) => brick.alive).length

    state.ball.x = target.x - state.ball.radius - 1
    state.ball.y = target.y + target.height / 2
    state.ball.vx = DEFAULT_CONFIG.ballSpeed
    state.ball.vy = 0

    expect(state.ball.vx).toBeGreaterThan(0)
    updateGame(state, { move: 0, start: false }, 0.01)

    expect(target.alive).toBe(false)
    expect(state.bricks.filter((brick) => brick.alive)).toHaveLength(
      initialAliveCount - 1,
    )
    expect(otherBricks.every((brick) => brick.alive)).toBe(true)
    expect(state.score).toBe(10)
    expect(state.ball.vx).toBeLessThan(0)

    updateGame(state, { move: 0, start: false }, 0)

    expect(target.alive).toBe(false)
    expect(state.score).toBe(10)
    expect(state.bricks.filter((brick) => brick.alive)).toHaveLength(
      initialAliveCount - 1,
    )
  })

  it('E5 - detects a frame-gap brick crossing at maximum valid ball speed', () => {
    const creation = createGame({
      lives: 3,
      paddleSpeed: 360,
      ballSpeed: 450,
    })
    expect(creation.ok).toBe(true)
    if (!creation.ok) return

    const state = creation.state
    updateGame(state, { move: 0, start: true }, 0)
    expect(state.status).toBe('RUNNING')

    const target = state.bricks[0]
    const unrelatedBricks = state.bricks.slice(1)
    unrelatedBricks.forEach((brick) => {
      brick.alive = false
    })
    const unrelatedBefore = unrelatedBricks.map((brick) => brick.alive)

    state.ball.x = target.x + target.width / 2
    state.ball.y = target.y - state.ball.radius - 1
    state.ball.vx = 0
    state.ball.vy = 450

    const projectedY = state.ball.y + state.ball.vy * 0.1
    expect(state.ball.y + state.ball.radius).toBeLessThan(target.y)
    expect(projectedY - state.ball.radius).toBeGreaterThan(
      target.y + target.height,
    )

    updateGame(state, { move: 0, start: false }, 0.1)

    expect({
      targetAlive: target.alive,
      aliveCount: state.bricks.filter((brick) => brick.alive).length,
      score: state.score,
      verticalDirection: Math.sign(state.ball.vy),
      unrelatedBrickChanged: unrelatedBricks.some(
        (brick, index) => brick.alive !== unrelatedBefore[index],
      ),
    }).toEqual({
      targetAlive: false,
      aliveCount: 0,
      score: 10,
      verticalDirection: -1,
      unrelatedBrickChanged: false,
    })
  })
})

function createReadyState() {
  const creation = createGame(DEFAULT_CONFIG)
  if (!creation.ok) throw new Error(creation.error)
  return creation.state
}

function createRunningState() {
  const state = createReadyState()
  updateGame(state, { move: 0, start: true }, 0)
  return state
}
