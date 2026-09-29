import { describe, expect, it } from 'vitest'
import { readGeminiConfig } from './config.js'

describe('backend Gemini configuration', () => {
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
