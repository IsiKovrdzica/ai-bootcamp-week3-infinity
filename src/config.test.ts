import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, validateGameConfig } from './config'

describe('validateGameConfig', () => {
  it('accepts the exact default configuration', () => {
    expect(validateGameConfig(DEFAULT_CONFIG)).toEqual({
      ok: true,
      value: DEFAULT_CONFIG,
    })
  })

  it.each([
    null,
    [],
    { lives: 3, paddleSpeed: 360 },
    { lives: 3, paddleSpeed: 360, ballSpeed: 240, extra: true },
    { lives: '3', paddleSpeed: 360, ballSpeed: 240 },
    { lives: 2, paddleSpeed: 360, ballSpeed: 240 },
    { lives: 3, paddleSpeed: 199, ballSpeed: 240 },
    { lives: 3, paddleSpeed: 601, ballSpeed: 240 },
    { lives: 3, paddleSpeed: 360, ballSpeed: 149 },
    { lives: 3, paddleSpeed: 360, ballSpeed: 451 },
    { lives: 3, paddleSpeed: Number.POSITIVE_INFINITY, ballSpeed: 240 },
    Object.assign(Object.create(null), {
      lives: 3,
      paddleSpeed: 360,
      ballSpeed: 240,
    }),
  ])('rejects invalid runtime input %#', (input) => {
    expect(validateGameConfig(input)).toMatchObject({ ok: false })
  })

  it('accepts inclusive speed boundaries without coercion', () => {
    expect(
      validateGameConfig({ lives: 3, paddleSpeed: 200, ballSpeed: 150 }),
    ).toMatchObject({ ok: true })
    expect(
      validateGameConfig({ lives: 3, paddleSpeed: 600, ballSpeed: 450 }),
    ).toMatchObject({ ok: true })
  })
})
