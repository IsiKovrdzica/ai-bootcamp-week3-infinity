import { describe, expect, it } from 'vitest'
import { GEMINI_FALLBACK_MODEL, readGeminiConfig } from './config.js'

describe('backend Gemini configuration', () => {
  it('keeps the only tested fallback model backend-only and fixed', () => {
    expect(GEMINI_FALLBACK_MODEL).toBe('gemini-3.5-flash-lite')
  })
  it.each([
    {},
    { GEMINI_API_KEY: ' ', GEMINI_MODEL: 'model' },
    { GEMINI_API_KEY: 'key', GEMINI_MODEL: ' ' },
  ])('returns a non-retryable configuration failure for absent or blank values', (environment) => {
    const result = readGeminiConfig(environment)
    expect(result).toMatchObject({ ok: false, failure: { kind: 'configuration' } })
  })

  it('reads only trimmed backend configuration values', () => {
    expect(readGeminiConfig({ GEMINI_API_KEY: ' key ', GEMINI_MODEL: ' model ' })).toEqual({
      ok: true,
      value: { apiKey: 'key', model: 'model' },
    })
  })
})
