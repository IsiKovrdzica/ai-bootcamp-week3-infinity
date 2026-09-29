import type { GameState } from '../game'
import type { GameSummary } from './contracts'

export function deriveGameSummary(
  state: Readonly<GameState>,
): GameSummary | null {
  if (state.status !== 'WON' && state.status !== 'GAME_OVER') return null

  return {
    outcome: state.status,
    score: state.score,
    bricksDestroyed: state.bricks.filter((brick) => !brick.alive).length,
    livesRemaining: state.lives,
    livesLost: state.config.lives - state.lives,
    durationSeconds: state.durationSeconds,
  }
}
