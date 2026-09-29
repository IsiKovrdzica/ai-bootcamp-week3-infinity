import { describe, expect, it } from 'vitest'
import {
  FALLBACK_CAPABILITY_MODEL,
  runGeminiFallbackCapability,
} from './verify-gemini-fallback-capability.js'
import type { GeminiConfig } from '../server/ai/config.js'
import type { AiAdviceProvider } from '../server/ai/provider.js'

const environment = { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'production-model' }

describe('offline Gemini fallback capability check', () => {
  it('is sanitized SKIPPED with missing backend credential and zero provider calls', async () => {
    let factoryCalls = 0
    const result = await runGeminiFallbackCapability({}, () => {
      factoryCalls += 1
      throw new Error('must not construct')
    })

    expect(result).toEqual({ model: FALLBACK_CAPABILITY_MODEL, status: 'SKIPPED', providerCallCount: 0, adviceValid: false })
    expect(factoryCalls).toBe(0)
  })

  it('reports provider construction failure before generateAdvice with zero calls', async () => {
    const result = await runGeminiFallbackCapability(environment, () => {
      throw new Error('construction details remain private')
    })

    expect(result).toEqual({ model: FALLBACK_CAPABILITY_MODEL, status: 'FAILED', providerCallCount: 0, adviceValid: false })
  })

  it('reports a generateAdvice failure after exactly one begun call', async () => {
    let providerCalls = 0
    const provider: AiAdviceProvider = {
      async generateAdvice() {
        providerCalls += 1
        throw new Error('provider details remain private')
      },
    }

    const result = await runGeminiFallbackCapability(environment, () => provider)
    expect(result).toEqual({ model: FALLBACK_CAPABILITY_MODEL, status: 'FAILED', providerCallCount: 1, adviceValid: false })
    expect(providerCalls).toBe(1)
  })

  it('rejects malformed unknown output after exactly one call', async () => {
    let providerCalls = 0
    const provider: AiAdviceProvider = {
      async generateAdvice() {
        providerCalls += 1
        return { summary: 'valid', recommendation: 'valid', category: 'unknown' }
      },
    }

    const result = await runGeminiFallbackCapability(environment, () => provider)
    expect(result).toEqual({ model: FALLBACK_CAPABILITY_MODEL, status: 'FAILED', providerCallCount: 1, adviceValid: false })
    expect(providerCalls).toBe(1)
  })

  it('uses exactly the fixed candidate model and passes valid unknown advice', async () => {
    let receivedConfig: GeminiConfig | undefined
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

    const result = await runGeminiFallbackCapability(environment, (config) => {
      receivedConfig = config
      return provider
    })
    expect(receivedConfig).toEqual({ apiKey: 'test-key', model: 'gemini-3.5-flash-lite' })
    expect(result).toEqual({ model: FALLBACK_CAPABILITY_MODEL, status: 'PASSED', providerCallCount: 1, adviceValid: true })
    expect(providerCalls).toBe(1)
  })
})
