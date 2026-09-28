import {
  ADVICE_CATEGORIES,
  GAME_OUTCOMES,
  type AiAdvice,
  type AiAdviceCategory,
  type GameOutcome,
  type GameSummary,
} from '../../src/ai/contracts.js'
import {
  BRICK_COUNT,
  POINTS_PER_BRICK,
  STARTING_LIVES,
  type ValidationResult,
} from './contracts.js'

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}

function hasExactlyKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value)
  return (
    actualKeys.length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  )
}

function isFiniteNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  )
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isGameOutcome(value: unknown): value is GameOutcome {
  return typeof value === 'string' && GAME_OUTCOMES.includes(value as GameOutcome)
}

function isAdviceCategory(value: unknown): value is AiAdviceCategory {
  return (
    typeof value === 'string' &&
    ADVICE_CATEGORIES.includes(value as AiAdviceCategory)
  )
}

function validAdviceText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= maxLength &&
    /\S/.test(value)
  )
}

export function validateGameSummary(value: unknown): ValidationResult<GameSummary> {
  if (
    !isPlainRecord(value) ||
    !hasExactlyKeys(value, [
      'outcome',
      'score',
      'bricksDestroyed',
      'livesRemaining',
      'livesLost',
      'durationSeconds',
    ])
  ) {
    return { ok: false, reason: 'Game summary must have exact fields.' }
  }

  const {
    outcome,
    score,
    bricksDestroyed,
    livesRemaining,
    livesLost,
    durationSeconds,
  } = value

  if (
    !isGameOutcome(outcome) ||
    !isFiniteNonNegativeInteger(score) ||
    !isFiniteNonNegativeInteger(bricksDestroyed) ||
    !isFiniteNonNegativeInteger(livesRemaining) ||
    !isFiniteNonNegativeInteger(livesLost) ||
    !isFiniteNonNegativeNumber(durationSeconds)
  ) {
    return { ok: false, reason: 'Game summary fields are invalid.' }
  }

  if (
    score !== bricksDestroyed * POINTS_PER_BRICK ||
    bricksDestroyed > BRICK_COUNT ||
    livesRemaining > STARTING_LIVES ||
    livesLost > STARTING_LIVES ||
    livesRemaining + livesLost !== STARTING_LIVES ||
    (outcome === 'WON' && bricksDestroyed !== BRICK_COUNT) ||
    (outcome === 'GAME_OVER' && livesRemaining !== 0)
  ) {
    return { ok: false, reason: 'Game summary is inconsistent.' }
  }

  return {
    ok: true,
    value: {
      outcome,
      score,
      bricksDestroyed,
      livesRemaining,
      livesLost,
      durationSeconds,
    },
  }
}

export function validateAiAdvice(value: unknown): ValidationResult<AiAdvice> {
  if (
    !isPlainRecord(value) ||
    !hasExactlyKeys(value, ['summary', 'recommendation', 'category'])
  ) {
    return { ok: false, reason: 'Advice must have exact fields.' }
  }

  const { summary, recommendation, category } = value
  if (
    !validAdviceText(summary, 160) ||
    !validAdviceText(recommendation, 220) ||
    !isAdviceCategory(category)
  ) {
    return { ok: false, reason: 'Advice fields are invalid.' }
  }

  return { ok: true, value: { summary, recommendation, category } }
}
