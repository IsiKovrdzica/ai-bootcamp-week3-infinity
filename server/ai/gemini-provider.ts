import { GoogleGenAI } from '@google/genai'
import type { GameSummary } from './contracts.js'
import type { GeminiConfig } from './config.js'
import { buildPostGameCoachPrompt } from './prompt.js'
import { ProviderFailure, type AiAdviceProvider, type ProviderFailureKind } from './provider.js'

export type GeminiGenerateContent = (request: {
  model: string
  contents: string
  config: {
    abortSignal: AbortSignal
    responseMimeType: 'application/json'
    responseJsonSchema: typeof AI_ADVICE_JSON_SCHEMA
    httpOptions: { retryOptions: { attempts: 1 } }
  }
}) => Promise<{
  text?: string
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
}>

export const AI_ADVICE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'recommendation', 'category'],
  properties: {
    summary: { type: 'string', maxLength: 160 },
    recommendation: { type: 'string', maxLength: 220 },
    category: {
      type: 'string',
      enum: ['survival', 'efficiency', 'consistency', 'general'],
    },
  },
} as const

export class GeminiAiAdviceProvider implements AiAdviceProvider {
  private readonly generateContent: GeminiGenerateContent

  constructor(
    private readonly config: GeminiConfig,
    generateContent?: GeminiGenerateContent,
  ) {
    if (generateContent) {
      this.generateContent = generateContent
      return
    }
    const client = new GoogleGenAI({ apiKey: config.apiKey })
    this.generateContent = (request) => client.models.generateContent(request)
  }

  async generateAdvice(
    summary: Readonly<GameSummary>,
    { signal }: { signal: AbortSignal },
  ): Promise<unknown> {
    if (signal.aborted) throw new ProviderFailure('client_cancelled')
    try {
      const response = await this.generateContent({
        model: this.config.model,
        contents: buildPostGameCoachPrompt(summary),
        config: {
          abortSignal: signal,
          responseMimeType: 'application/json',
          responseJsonSchema: AI_ADVICE_JSON_SCHEMA,
          httpOptions: { retryOptions: { attempts: 1 } },
        },
      })
      if (typeof response.text !== 'string') throw new ProviderFailure('programming')
      return JSON.parse(response.text) as unknown
    } catch (error) {
      if (error instanceof ProviderFailure) throw error
      throw new ProviderFailure(classifyGeminiFailure(error, signal))
    }
  }
}

export function classifyGeminiFailure(
  error: unknown,
  signal: AbortSignal,
): ProviderFailureKind {
  if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
    return 'client_cancelled'
  }
  if (error instanceof TypeError) return 'transient'
  const candidate = error as { status?: unknown; code?: unknown; message?: unknown }
  const status = typeof candidate?.status === 'number'
    ? candidate.status
    : typeof candidate?.code === 'number'
      ? candidate.code
      : undefined
  if (status === 408 || status === 429) return 'transient'
  if (status === 500 || status === 502 || status === 503) return 'provider_unavailable'
  if (status !== undefined && status >= 500 && status <= 599) return 'permanent'
  if (status === 401 || status === 403) return 'auth'
  const message = typeof candidate?.message === 'string' ? candidate.message.toLowerCase() : ''
  if (status !== undefined && (message.includes('safety') || message.includes('blocked'))) return 'safety'
  if (status !== undefined && (message.includes('configuration') || message.includes('unsupported model'))) return 'configuration'
  if (status !== undefined && status >= 400 && status <= 499) return 'permanent'
  return 'programming'
}

export function extractSafeTokenUsage(metadata: unknown):
  | { input?: number; output?: number }
  | undefined {
  if (metadata === null || typeof metadata !== 'object') return undefined
  const candidate = metadata as {
    promptTokenCount?: unknown
    candidatesTokenCount?: unknown
  }
  const input = safeTokenCount(candidate.promptTokenCount)
  const output = safeTokenCount(candidate.candidatesTokenCount)
  return input === undefined && output === undefined ? undefined : { input, output }
}

function safeTokenCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined
}
