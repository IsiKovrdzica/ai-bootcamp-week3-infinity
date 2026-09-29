import { describe, expect, it } from 'vitest'
import { runGeminiVerification } from './verify-gemini.js'
import type { AiAdviceProvider } from '../server/ai/provider.js'

describe('offline Gemini verification dry path', () => {
  it('is sanitized SKIPPED with missing configuration and makes zero provider calls', async () => {
    let providerFactoryCalls = 0
    const result = await runGeminiVerification({}, () => {
      providerFactoryCalls += 1
      throw new Error('must not construct a provider')
    })

    expect(result).toEqual({ status: 'SKIPPED', providerCallCount: 0 })
    expect(providerFactoryCalls).toBe(0)
    expect(JSON.stringify(result)).not.toMatch(/GEMINI|key|model|secret/i)
  })

  it('uses one provider call and reports only sanitized validity metadata', async () => {
    let providerCalls = 0
    const provider: AiAdviceProvider = {
      async generateAdvice() {
        providerCalls += 1
        return {
          summary: 'You cleared the board.',
          recommendation: 'Track the ball early.',
          category: 'consistency',
        }
      },
    }

    const result = await runGeminiVerification(
      { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model' },
      () => provider,
    )
    expect(result).toEqual({ status: 'PASSED', providerCallCount: 1, adviceValid: true })
    expect(providerCalls).toBe(1)
  })

  it('reports construction failure before generateAdvice as FAILED with zero provider calls', async () => {
    const result = await runGeminiVerification(
      { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model' },
      () => { throw new Error('construction details must remain private') },
    )

    expect(result).toEqual({ status: 'FAILED', providerCallCount: 0, adviceValid: false })
  })

  it('reports a generateAdvice failure after one begun call', async () => {
    let providerCalls = 0
    const provider: AiAdviceProvider = {
      async generateAdvice() {
        providerCalls += 1
        throw new Error('provider details must remain private')
      },
    }

    const result = await runGeminiVerification(
      { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model' },
      () => provider,
    )
    expect(result).toEqual({ status: 'FAILED', providerCallCount: 1, adviceValid: false })
    expect(providerCalls).toBe(1)
  })
})
