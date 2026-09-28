export const GAME_OUTCOMES = ['WON', 'GAME_OVER'] as const
export type GameOutcome = (typeof GAME_OUTCOMES)[number]

export type GameSummary = {
  outcome: GameOutcome
  score: number
  bricksDestroyed: number
  livesRemaining: number
  livesLost: number
  durationSeconds: number
}

export const ADVICE_CATEGORIES = [
  'survival',
  'efficiency',
  'consistency',
  'general',
] as const
export type AiAdviceCategory = (typeof ADVICE_CATEGORIES)[number]

export type AiAdvice = {
  summary: string
  recommendation: string
  category: AiAdviceCategory
}

export const INVALID_GAME_SUMMARY_ERROR = {
  error: { code: 'INVALID_GAME_SUMMARY', message: 'Invalid game summary.' },
} as const

export const AI_ADVICE_UNAVAILABLE_ERROR = {
  error: {
    code: 'AI_ADVICE_UNAVAILABLE',
    message: 'AI advice is temporarily unavailable. Please try again later.',
  },
} as const
