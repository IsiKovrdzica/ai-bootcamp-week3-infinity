import './style.css'
import { createAdviceTransport } from './ai/api-client'
import { CoachController, type CoachState } from './ai/coach-controller'
import { deriveGameSummary } from './ai/game-summary'
import { DEFAULT_CONFIG } from './config'
import { createGame, updateGame } from './game'
import { InputController } from './input'
import { renderGame } from './render'

declare global {
  interface Window {
    __brickPulseSmoke?: {
      complete: (status: 'WON' | 'GAME_OVER') => void
      restart: () => void
    }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>('#game')
const errorElement = document.querySelector<HTMLParagraphElement>('#error')
const coachElement = document.querySelector<HTMLElement>('#ai-coach')
const coachButton = document.querySelector<HTMLButtonElement>('#ask-ai-coach')
const coachStatus = document.querySelector<HTMLParagraphElement>('#ai-coach-status')
const coachSummary = document.querySelector<HTMLParagraphElement>('#ai-coach-summary')
const coachRecommendation = document.querySelector<HTMLParagraphElement>('#ai-coach-recommendation')
const coachCategory = document.querySelector<HTMLParagraphElement>('#ai-coach-category')

if (
  !canvas ||
  !errorElement ||
  !coachElement ||
  !coachButton ||
  !coachStatus ||
  !coachSummary ||
  !coachRecommendation ||
  !coachCategory
) {
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
    const controller = new CoachController({
      transport: createAdviceTransport(fetch),
      onStateChange: (coachState) => renderCoachState(
        coachState,
        coachElement,
        coachButton,
        coachStatus,
        coachSummary,
        coachRecommendation,
        coachCategory,
      ),
    })
    coachButton.addEventListener('click', () => controller.requestAdvice())
    let previousTime = performance.now()
    let previousStatus = state.status

    if (import.meta.env.MODE === 'smoke') {
      window.__brickPulseSmoke = {
        complete: (status) => {
          state.status = status
          if (status === 'WON') {
            state.bricks.forEach((brick) => { brick.alive = false })
            state.score = 320
          } else {
            state.lives = 0
          }
          const summary = deriveGameSummary(state)
          if (summary) controller.showTerminal(summary)
          previousStatus = state.status
        },
        restart: () => {
          updateGame(state, { move: 0, start: true }, 0)
          controller.restart()
          previousStatus = state.status
        },
      }
    }

    const frame = (currentTime: number) => {
      const deltaSeconds = (currentTime - previousTime) / 1000
      previousTime = currentTime
      updateGame(state, input.read(), deltaSeconds)
      if (
        (state.status === 'WON' || state.status === 'GAME_OVER') &&
        previousStatus !== state.status
      ) {
        const summary = deriveGameSummary(state)
        if (summary) controller.showTerminal(summary)
      } else if (
        previousStatus === 'WON' ||
        previousStatus === 'GAME_OVER'
      ) {
        if (state.status === 'READY') controller.restart()
      }
      previousStatus = state.status
      renderGame(context, state)
      requestAnimationFrame(frame)
    }

    renderGame(context, state)
    requestAnimationFrame(frame)
  }
}

function renderCoachState(
  state: CoachState,
  coachElement: HTMLElement,
  coachButton: HTMLButtonElement,
  status: HTMLParagraphElement,
  summary: HTMLParagraphElement,
  recommendation: HTMLParagraphElement,
  category: HTMLParagraphElement,
): void {
  coachElement.hidden = state.kind === 'hidden'
  coachButton.disabled = state.kind === 'hidden' || state.kind === 'pending'
  status.textContent = ''
  summary.textContent = ''
  recommendation.textContent = ''
  category.textContent = ''

  if (state.kind === 'pending') {
    status.textContent = 'ANALYZING...'
  } else if (state.kind === 'success') {
    summary.textContent = state.advice.summary
    recommendation.textContent = state.advice.recommendation
    category.textContent = state.advice.category
  } else if (state.kind === 'failure') {
    status.textContent = 'AI advice is temporarily unavailable. Please try again later.'
  }
}
