import { type GameConfig, validateGameConfig } from './config'

export const FIELD_WIDTH = 640
export const FIELD_HEIGHT = 480
export const PADDLE_WIDTH = 96
export const PADDLE_HEIGHT = 14
export const BALL_RADIUS = 7

const PADDLE_Y = 440
const BALL_GAP = 2
const BRICK_ROWS = 4
const BRICK_COLUMNS = 8
const BRICK_WIDTH = 64
const BRICK_HEIGHT = 20
const BRICK_GAP_X = 6
const BRICK_GAP_Y = 8
const BRICK_START_X = 43
const BRICK_START_Y = 64
const MAX_SIMULATION_STEP = 1 / 60

export type GameStatus = 'READY' | 'RUNNING' | 'WON' | 'GAME_OVER'

export type Paddle = {
  x: number
  y: number
  width: number
  height: number
}

export type Ball = {
  x: number
  y: number
  radius: number
  vx: number
  vy: number
}

export type Brick = {
  x: number
  y: number
  width: number
  height: number
  row: number
  alive: boolean
}

export type GameState = {
  config: GameConfig
  status: GameStatus
  score: number
  lives: number
  paddle: Paddle
  ball: Ball
  bricks: Brick[]
}

export type PlayerInput = {
  move: -1 | 0 | 1
  start: boolean
}

export type CreateGameResult =
  | { ok: true; state: GameState }
  | { ok: false; error: string }

export function createGame(config: unknown): CreateGameResult {
  const validation = validateGameConfig(config)
  if (!validation.ok) return validation

  return { ok: true, state: createInitialState(validation.value) }
}

export function updateGame(
  state: GameState,
  input: PlayerInput,
  deltaSeconds: number,
): void {
  if (state.status === 'WON' || state.status === 'GAME_OVER') {
    if (input.start) {
      Object.assign(state, createInitialState(state.config))
    }
    return
  }

  if (state.status === 'READY') {
    movePaddle(state, input.move, deltaSeconds)
    attachBallToPaddle(state)
    if (input.start) launchBall(state)
    return
  }

  const stepCount =
    deltaSeconds > MAX_SIMULATION_STEP
      ? Math.ceil(deltaSeconds / MAX_SIMULATION_STEP)
      : 1
  const stepDelta = deltaSeconds / stepCount

  for (let step = 0; step < stepCount; step += 1) {
    movePaddle(state, input.move, stepDelta)
    moveBall(state, stepDelta)
    resolveWalls(state.ball)
    resolvePaddle(state)
    if (resolveBrick(state, stepDelta)) return

    if (state.ball.y - state.ball.radius >= FIELD_HEIGHT) {
      loseLife(state)
    }

    if (state.status !== 'RUNNING') return
  }
}

function createInitialState(config: GameConfig): GameState {
  const paddle = createPaddle()
  const state: GameState = {
    config: { ...config },
    status: 'READY',
    score: 0,
    lives: config.lives,
    paddle,
    ball: {
      x: 0,
      y: 0,
      radius: BALL_RADIUS,
      vx: 0,
      vy: 0,
    },
    bricks: createBricks(),
  }
  attachBallToPaddle(state)
  return state
}

function createPaddle(): Paddle {
  return {
    x: (FIELD_WIDTH - PADDLE_WIDTH) / 2,
    y: PADDLE_Y,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  }
}

function createBricks(): Brick[] {
  const bricks: Brick[] = []
  for (let row = 0; row < BRICK_ROWS; row += 1) {
    for (let column = 0; column < BRICK_COLUMNS; column += 1) {
      bricks.push({
        x: BRICK_START_X + column * (BRICK_WIDTH + BRICK_GAP_X),
        y: BRICK_START_Y + row * (BRICK_HEIGHT + BRICK_GAP_Y),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        row,
        alive: true,
      })
    }
  }
  return bricks
}

function movePaddle(
  state: GameState,
  direction: PlayerInput['move'],
  deltaSeconds: number,
): void {
  const nextX =
    state.paddle.x + direction * state.config.paddleSpeed * deltaSeconds
  state.paddle.x = clamp(nextX, 0, FIELD_WIDTH - state.paddle.width)
}

function attachBallToPaddle(state: GameState): void {
  state.ball.x = state.paddle.x + state.paddle.width / 2
  state.ball.y = state.paddle.y - state.ball.radius - BALL_GAP
  state.ball.vx = 0
  state.ball.vy = 0
}

function launchBall(state: GameState): void {
  const component = state.config.ballSpeed / Math.sqrt(2)
  state.ball.vx = component
  state.ball.vy = -component
  state.status = 'RUNNING'
}

function moveBall(state: GameState, deltaSeconds: number): void {
  state.ball.x += state.ball.vx * deltaSeconds
  state.ball.y += state.ball.vy * deltaSeconds
}

function resolveWalls(ball: Ball): void {
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius
    ball.vx = Math.abs(ball.vx)
  } else if (ball.x + ball.radius > FIELD_WIDTH) {
    ball.x = FIELD_WIDTH - ball.radius
    ball.vx = -Math.abs(ball.vx)
  }

  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius
    ball.vy = Math.abs(ball.vy)
  }
}

function resolvePaddle(state: GameState): void {
  const { ball, paddle } = state
  if (ball.vy <= 0 || !circleIntersectsRectangle(ball, paddle)) return

  ball.y = paddle.y - ball.radius
  ball.vy = -Math.abs(ball.vy)
}

function resolveBrick(state: GameState, deltaSeconds: number): boolean {
  const brick = state.bricks.find(
    (candidate) =>
      candidate.alive && circleIntersectsRectangle(state.ball, candidate),
  )
  if (!brick) return false

  const previousX = state.ball.x - state.ball.vx * deltaSeconds
  const previousY = state.ball.y - state.ball.vy * deltaSeconds
  const approachedFromSide =
    previousX + state.ball.radius <= brick.x ||
    previousX - state.ball.radius >= brick.x + brick.width
  const approachedVertically =
    previousY + state.ball.radius <= brick.y ||
    previousY - state.ball.radius >= brick.y + brick.height

  if (approachedFromSide && !approachedVertically) {
    state.ball.vx *= -1
  } else {
    state.ball.vy *= -1
  }

  brick.alive = false
  state.score += 10
  if (state.bricks.every((candidate) => !candidate.alive)) {
    state.status = 'WON'
    return true
  }
  return false
}

function loseLife(state: GameState): void {
  state.lives -= 1
  if (state.lives === 0) {
    state.status = 'GAME_OVER'
    return
  }

  state.status = 'READY'
  state.paddle = createPaddle()
  attachBallToPaddle(state)
}

function circleIntersectsRectangle(
  ball: Ball,
  rectangle: { x: number; y: number; width: number; height: number },
): boolean {
  const closestX = clamp(ball.x, rectangle.x, rectangle.x + rectangle.width)
  const closestY = clamp(ball.y, rectangle.y, rectangle.y + rectangle.height)
  const dx = ball.x - closestX
  const dy = ball.y - closestY
  return dx * dx + dy * dy <= ball.radius * ball.radius
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}
