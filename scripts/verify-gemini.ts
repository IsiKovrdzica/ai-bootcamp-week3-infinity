import { readGeminiConfig, type GeminiConfig } from '../server/ai/config.js'
import { GeminiAiAdviceProvider } from '../server/ai/gemini-provider.js'
import type { AiAdviceProvider } from '../server/ai/provider.js'
import { validateAiAdvice, validateGameSummary } from '../server/ai/validation.js'

export const VERIFICATION_SUMMARY = {
  outcome: 'WON',
  score: 320,
  bricksDestroyed: 32,
  livesRemaining: 3,
  livesLost: 0,
  durationSeconds: 30,
} as const

export type GeminiVerificationResult =
  | { status: 'SKIPPED'; providerCallCount: 0 }
  | { status: 'PASSED'; providerCallCount: 1; adviceValid: true }
  | { status: 'FAILED'; providerCallCount: 0 | 1; adviceValid: false }

export async function runGeminiVerification(
  environment: Record<string, string | undefined>,
  createProvider: (config: GeminiConfig) => AiAdviceProvider = (config) => new GeminiAiAdviceProvider(config),
): Promise<GeminiVerificationResult> {
  const config = readGeminiConfig(environment)
  if (!config.ok) return { status: 'SKIPPED', providerCallCount: 0 }

  const summary = validateGameSummary(VERIFICATION_SUMMARY)
  if (!summary.ok) return { status: 'FAILED', providerCallCount: 0, adviceValid: false }

  let provider: AiAdviceProvider
  try {
    provider = createProvider(config.value)
  } catch {
    return { status: 'FAILED', providerCallCount: 0, adviceValid: false }
  }

  try {
    const output: unknown = await provider.generateAdvice(summary.value, {
      signal: new AbortController().signal,
    })
    return validateAiAdvice(output).ok
      ? { status: 'PASSED', providerCallCount: 1, adviceValid: true }
      : { status: 'FAILED', providerCallCount: 1, adviceValid: false }
  } catch {
    return { status: 'FAILED', providerCallCount: 1, adviceValid: false }
  }
}

if (process.argv[1]?.endsWith('verify-gemini.ts')) {
  void runGeminiVerification(process.env).then((result) => {
    console.log(JSON.stringify(result))
  })
}
