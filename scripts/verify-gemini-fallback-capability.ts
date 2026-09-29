import type { GeminiConfig } from '../server/ai/config.js'
import { GeminiAiAdviceProvider } from '../server/ai/gemini-provider.js'
import type { AiAdviceProvider } from '../server/ai/provider.js'
import { validateAiAdvice, validateGameSummary } from '../server/ai/validation.js'
import { VERIFICATION_SUMMARY } from './verify-gemini.js'

export const FALLBACK_CAPABILITY_MODEL = 'gemini-3.5-flash-lite'

export type GeminiFallbackCapabilityResult =
  | { model: typeof FALLBACK_CAPABILITY_MODEL; status: 'SKIPPED'; providerCallCount: 0; adviceValid: false }
  | { model: typeof FALLBACK_CAPABILITY_MODEL; status: 'PASSED'; providerCallCount: 1; adviceValid: true }
  | { model: typeof FALLBACK_CAPABILITY_MODEL; status: 'FAILED'; providerCallCount: 0 | 1; adviceValid: false }

export async function runGeminiFallbackCapability(
  environment: Record<string, string | undefined>,
  createProvider: (config: GeminiConfig) => AiAdviceProvider = (config) => new GeminiAiAdviceProvider(config),
): Promise<GeminiFallbackCapabilityResult> {
  const apiKey = environment.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return { model: FALLBACK_CAPABILITY_MODEL, status: 'SKIPPED', providerCallCount: 0, adviceValid: false }
  }

  const summary = validateGameSummary(VERIFICATION_SUMMARY)
  if (!summary.ok) {
    return { model: FALLBACK_CAPABILITY_MODEL, status: 'FAILED', providerCallCount: 0, adviceValid: false }
  }

  let provider: AiAdviceProvider
  try {
    provider = createProvider({ apiKey, model: FALLBACK_CAPABILITY_MODEL })
  } catch {
    return { model: FALLBACK_CAPABILITY_MODEL, status: 'FAILED', providerCallCount: 0, adviceValid: false }
  }

  try {
    const output: unknown = await provider.generateAdvice(summary.value, {
      signal: new AbortController().signal,
    })
    return validateAiAdvice(output).ok
      ? { model: FALLBACK_CAPABILITY_MODEL, status: 'PASSED', providerCallCount: 1, adviceValid: true }
      : { model: FALLBACK_CAPABILITY_MODEL, status: 'FAILED', providerCallCount: 1, adviceValid: false }
  } catch {
    return { model: FALLBACK_CAPABILITY_MODEL, status: 'FAILED', providerCallCount: 1, adviceValid: false }
  }
}

if (process.argv[1]?.endsWith('verify-gemini-fallback-capability.ts')) {
  void runGeminiFallbackCapability(process.env).then((result) => {
    console.log(JSON.stringify(result))
  })
}
