import { ProviderFailure } from './provider.js'

export const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite'

export type GeminiConfig = {
  apiKey: string
  model: string
}

export type GeminiConfigResult =
  | { ok: true; value: GeminiConfig }
  | { ok: false; failure: ProviderFailure }

export function readGeminiConfig(
  environment: Record<string, string | undefined>,
): GeminiConfigResult {
  const apiKey = environment.GEMINI_API_KEY?.trim()
  const model = environment.GEMINI_MODEL?.trim()
  if (!apiKey || !model) {
    return { ok: false, failure: new ProviderFailure('configuration') }
  }
  return { ok: true, value: { apiKey, model } }
}
