import { describe, expect, it } from 'vitest'
import {
  validateAiAdvice,
  validateGameSummary,
} from './validation.js'

const validSummary = {
  outcome: 'WON',
  score: 320,
  bricksDestroyed: 32,
  livesRemaining: 3,
  livesLost: 0,
  durationSeconds: 41.5,
}

const validAdvice = {
  summary: 'You cleared every brick.',
  recommendation: 'Keep your paddle centered before each return.',
  category: 'efficiency',
}

describe('GameSummary runtime validation', () => {
  it('accepts an exact semantically valid completed-game summary', () => {
    expect(validateGameSummary(validSummary)).toEqual({
      ok: true,
      value: validSummary,
    })
  })

  it.each([
    null,
    [],
    'summary',
    { ...validSummary, extra: true },
    { score: 320 },
    { ...validSummary, score: '320' },
    { ...validSummary, score: Number.NaN },
    { ...validSummary, durationSeconds: Number.POSITIVE_INFINITY },
    { ...validSummary, bricksDestroyed: -1 },
    { ...validSummary, livesRemaining: 1.5 },
  ])('rejects structural invalid value %#', (value) => {
    expect(validateGameSummary(value).ok).toBe(false)
  })

  it.each([
    { ...validSummary, score: 310 },
    { ...validSummary, bricksDestroyed: 31, score: 310 },
    { ...validSummary, bricksDestroyed: 33, score: 330 },
    { ...validSummary, livesRemaining: 4, livesLost: -1 },
    { ...validSummary, livesRemaining: 2, livesLost: 0 },
    { ...validSummary, outcome: 'WON', bricksDestroyed: 31, score: 310 },
    {
      ...validSummary,
      outcome: 'GAME_OVER',
      livesRemaining: 1,
      livesLost: 2,
    },
  ])('rejects semantic invalid value %#', (value) => {
    expect(validateGameSummary(value).ok).toBe(false)
  })
})

describe('AiAdvice runtime validation', () => {
  it('accepts exact valid advice', () => {
    expect(validateAiAdvice(validAdvice)).toEqual({
      ok: true,
      value: validAdvice,
    })
  })

  it.each([
    null,
    [],
    { summary: 'x', recommendation: 'y' },
    { ...validAdvice, extra: true },
    { ...validAdvice, summary: 1 },
    { ...validAdvice, summary: '   ' },
    { ...validAdvice, recommendation: '' },
    { ...validAdvice, summary: 'x'.repeat(161) },
    { ...validAdvice, recommendation: 'x'.repeat(221) },
    { ...validAdvice, category: 'other' },
    { ...validAdvice, category: 'Efficiency' },
  ])('rejects malformed provider output %#', (value) => {
    expect(validateAiAdvice(value).ok).toBe(false)
  })

  it.each(['survival', 'efficiency', 'consistency', 'general'])(
    'accepts allowed category %s',
    (category) => {
      expect(validateAiAdvice({ ...validAdvice, category }).ok).toBe(true)
    },
  )
})
