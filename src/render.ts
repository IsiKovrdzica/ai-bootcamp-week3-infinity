import { FIELD_HEIGHT, FIELD_WIDTH, type GameState } from './game'

const COLORS = {
  background: '#101426',
  grid: '#18203a',
  text: '#f3f5f7',
  muted: '#a9b1d6',
  paddle: '#66f2d5',
  ball: '#fff27a',
  bricks: ['#ff5c8a', '#ff9866', '#66d9ff', '#9d7aff'],
} as const

export function renderGame(
  context: CanvasRenderingContext2D,
  state: GameState,
): void {
  context.fillStyle = COLORS.background
  context.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT)
  drawGrid(context)
  drawHud(context, state)
  drawBricks(context, state)
  drawPaddle(context, state)
  drawBall(context, state)
  drawStatus(context, state)
}

function drawGrid(context: CanvasRenderingContext2D): void {
  context.strokeStyle = COLORS.grid
  context.lineWidth = 1
  for (let x = 0; x <= FIELD_WIDTH; x += 32) {
    context.beginPath()
    context.moveTo(x + 0.5, 0)
    context.lineTo(x + 0.5, FIELD_HEIGHT)
    context.stroke()
  }
  for (let y = 0; y <= FIELD_HEIGHT; y += 32) {
    context.beginPath()
    context.moveTo(0, y + 0.5)
    context.lineTo(FIELD_WIDTH, y + 0.5)
    context.stroke()
  }
}

function drawHud(
  context: CanvasRenderingContext2D,
  state: GameState,
): void {
  context.fillStyle = COLORS.text
  context.font = 'bold 18px monospace'
  context.textBaseline = 'top'
  context.textAlign = 'left'
  context.fillText(`SCORE ${state.score.toString().padStart(4, '0')}`, 20, 18)
  context.textAlign = 'right'
  context.fillText(`LIVES ${state.lives}`, FIELD_WIDTH - 20, 18)
}

function drawBricks(
  context: CanvasRenderingContext2D,
  state: GameState,
): void {
  for (const brick of state.bricks) {
    if (!brick.alive) continue
    context.fillStyle = COLORS.bricks[brick.row]
    context.fillRect(brick.x, brick.y, brick.width, brick.height)
    context.fillStyle = '#ffffff35'
    context.fillRect(brick.x + 3, brick.y + 3, brick.width - 6, 3)
  }
}

function drawPaddle(
  context: CanvasRenderingContext2D,
  state: GameState,
): void {
  context.fillStyle = COLORS.paddle
  context.fillRect(
    state.paddle.x,
    state.paddle.y,
    state.paddle.width,
    state.paddle.height,
  )
  context.fillStyle = '#ffffff66'
  context.fillRect(state.paddle.x + 5, state.paddle.y + 3, 28, 3)
}

function drawBall(
  context: CanvasRenderingContext2D,
  state: GameState,
): void {
  context.fillStyle = COLORS.ball
  context.beginPath()
  context.arc(
    state.ball.x,
    state.ball.y,
    state.ball.radius,
    0,
    Math.PI * 2,
  )
  context.fill()
}

function drawStatus(
  context: CanvasRenderingContext2D,
  state: GameState,
): void {
  if (state.status === 'RUNNING') return

  const primary =
    state.status === 'READY'
      ? 'READY'
      : state.status === 'WON'
        ? 'YOU WON'
        : 'GAME OVER'
  const secondary =
    state.status === 'READY' ? 'PRESS SPACE TO START' : 'PRESS SPACE TO RESTART'

  context.fillStyle = '#090b14dd'
  context.fillRect(130, 280, 380, 92)
  context.strokeStyle = COLORS.paddle
  context.lineWidth = 2
  context.strokeRect(130, 280, 380, 92)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = COLORS.text
  context.font = 'bold 28px monospace'
  context.fillText(primary, FIELD_WIDTH / 2, 310)
  context.fillStyle = COLORS.muted
  context.font = '15px monospace'
  context.fillText(secondary, FIELD_WIDTH / 2, 345)
}
