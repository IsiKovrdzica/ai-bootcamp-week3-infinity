import './style.css'
import { DEFAULT_CONFIG } from './config'
import { createGame, updateGame } from './game'
import { InputController } from './input'
import { renderGame } from './render'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
const errorElement = document.querySelector<HTMLParagraphElement>('#error')

if (!canvas || !errorElement) {
  throw new Error('Required page elements are missing.')
}

const context = canvas.getContext('2d')
if (!context) {
  errorElement.textContent = 'Canvas is not supported by this browser.'
} else {
  const creation = createGame(DEFAULT_CONFIG)
  if (!creation.ok) {
    errorElement.textContent = `Invalid game configuration: ${creation.error}`
  } else {
    const state = creation.state
    const input = new InputController(window)
    let previousTime = performance.now()

    const frame = (currentTime: number) => {
      const deltaSeconds = (currentTime - previousTime) / 1000
      previousTime = currentTime
      updateGame(state, input.read(), deltaSeconds)
      renderGame(context, state)
      requestAnimationFrame(frame)
    }

    renderGame(context, state)
    requestAnimationFrame(frame)
  }
}
