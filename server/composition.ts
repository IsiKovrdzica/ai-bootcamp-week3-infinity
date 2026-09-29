import { createAdviceService, type AdviceService } from './ai/advice-service.js'
import { readGeminiConfig } from './ai/config.js'
import { GeminiAiAdviceProvider } from './ai/gemini-provider.js'

const unavailableService: AdviceService = {
  async requestAdvice() {
    return { ok: false, kind: 'unavailable' }
  },
}

export function createProductionAdviceService(
  environment: Record<string, string | undefined>,
): AdviceService {
  const configuration = readGeminiConfig(environment)
  if (!configuration.ok) return unavailableService
  return createAdviceService(
    new GeminiAiAdviceProvider(configuration.value),
    undefined,
    { provider: 'gemini', model: configuration.value.model },
  )
}
