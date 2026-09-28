import type { GameSummary } from './contracts.js'

export const validWonSummary: GameSummary = {
  outcome: 'WON',
  score: 320,
  bricksDestroyed: 32,
  livesRemaining: 3,
  livesLost: 0,
  durationSeconds: 30,
}

export const invalidGameSummaryFixtures: readonly unknown[] = [
  null,
  [],
  { ...validWonSummary, extra: true },
  { ...validWonSummary, score: '320' },
  { ...validWonSummary, score: Number.NaN },
  { ...validWonSummary, score: -10 },
  { ...validWonSummary, bricksDestroyed: 31.5 },
  { ...validWonSummary, score: 310 },
  { ...validWonSummary, bricksDestroyed: 31, score: 310 },
  { ...validWonSummary, livesRemaining: 2, livesLost: 0 },
  {
    ...validWonSummary,
    outcome: 'GAME_OVER',
    livesRemaining: 1,
    livesLost: 2,
  },
]
