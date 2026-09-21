export type GameConfig = {
  lives: number
  paddleSpeed: number
  ballSpeed: number
}

export type ValidationResult =
  | { ok: true; value: GameConfig }
  | { ok: false; error: string }

export const DEFAULT_CONFIG: GameConfig = {
  lives: 3,
  paddleSpeed: 360,
  ballSpeed: 240,
}

const CONFIG_KEYS = ['ballSpeed', 'lives', 'paddleSpeed']

export function validateGameConfig(input: unknown): ValidationResult {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  ) {
    return { ok: false, error: 'Configuration must be a plain object.' }
  }

  const keys = Object.keys(input).sort()
  if (
    keys.length !== CONFIG_KEYS.length ||
    keys.some((key, index) => key !== CONFIG_KEYS[index])
  ) {
    return { ok: false, error: 'Configuration has missing or unexpected keys.' }
  }

  const candidate = input as Record<string, unknown>
  if (candidate.lives !== 3) {
    return { ok: false, error: 'lives must be the integer 3.' }
  }

  if (!isFiniteNumberInRange(candidate.paddleSpeed, 200, 600)) {
    return {
      ok: false,
      error: 'paddleSpeed must be a finite number from 200 through 600.',
    }
  }

  if (!isFiniteNumberInRange(candidate.ballSpeed, 150, 450)) {
    return {
      ok: false,
      error: 'ballSpeed must be a finite number from 150 through 450.',
    }
  }

  return {
    ok: true,
    value: {
      lives: candidate.lives,
      paddleSpeed: candidate.paddleSpeed,
      ballSpeed: candidate.ballSpeed,
    },
  }
}

function isFiniteNumberInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  )
}
