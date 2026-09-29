import type { GameSummary } from './contracts.js'

export const POST_GAME_COACH_PROMPT_VERSION = 'brickpulse-post-game-coach/v1'

export function buildPostGameCoachPrompt(summary: Readonly<GameSummary>): string {
  return [
    'You are BrickPulse Post-Game Coach.',
    'Use only the completed-game data below. Do not invent game events or hidden state.',
    `outcome: ${summary.outcome}`,
    `score: ${summary.score}`,
    `bricksDestroyed: ${summary.bricksDestroyed}`,
    `livesRemaining: ${summary.livesRemaining}`,
    `livesLost: ${summary.livesLost}`,
    `durationSeconds: ${summary.durationSeconds}`,
    'Return JSON with exactly summary, recommendation, and category.',
    'summary must be non-empty and at most 160 characters.',
    'recommendation must be non-empty and at most 220 characters.',
    'category must be exactly one of survival, efficiency, consistency, general.',
  ].join('\n')
}
