import type { AiAdvice, GameSummary } from '../../src/ai/contracts.js'

export type { AiAdvice, GameSummary }

export const BRICK_COUNT = 32
export const STARTING_LIVES = 3
export const POINTS_PER_BRICK = 10

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string }
