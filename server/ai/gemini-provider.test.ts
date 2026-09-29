import { describe, expect, it } from 'vitest'
import { validWonSummary } from './game-summary-fixtures.js'
import {
  GeminiAiAdviceProvider,
  extractSafeTokenUsage,
  type GeminiGenerateContent,
} from './gemini-provider.js'
import { ProviderFailure } from './provider.js'

const validText = JSON.stringify({
  summary: 'You cleared every brick.',
  recommendation: 'Center the paddle earlier.',
  category: 'efficiency',
})

describe('GeminiAiAdviceProvider', () => {
  it('uses configured model, prompt data, abort signal, one SDK attempt, and exact structured schema', async () => {
    const calls: unknown[] = []
    const generateContent: GeminiGenerateContent = async (request) => {
      calls.push(request)
      return { text: validText, usageMetadata: { promptTokenCount: 21, candidatesTokenCount: 8 } }
    }
    const provider = new GeminiAiAdviceProvider({ apiKey: 'test-key', model: 'test-model' }, generateContent)
    const controller = new AbortController()

    await expect(provider.generateAdvice(validWonSummary, { signal: controller.signal })).resolves.toEqual(JSON.parse(validText))
    expect(calls).toEqual([expect.objectContaining({
      model: 'test-model',
      contents: expect.stringContaining('durationSeconds'),
      config: expect.objectContaining({
        abortSignal: controller.signal,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object', additionalProperties: false,
          required: ['summary', 'recommendation', 'category'],
          properties: expect.objectContaining({
            category: { type: 'string', enum: ['survival', 'efficiency', 'consistency', 'general'] },
          }),
        },
        httpOptions: { retryOptions: { attempts: 1 } },
      }),
    })])
    const request = calls[0] as { contents: string }
    for (const value of Object.values(validWonSummary)) expect(request.contents).toContain(String(value))
    expect(request.contents).not.toMatch(/paddle|ball|brick(?:s)?\s*:\s*\[/i)
  })

  it('returns parsed provider JSON as unknown and controls malformed JSON', async () => {
    const good = new GeminiAiAdviceProvider({ apiKey: 'test-key', model: 'test-model' }, async () => ({ text: validText }))
    const bad = new GeminiAiAdviceProvider({ apiKey: 'test-key', model: 'test-model' }, async () => ({ text: '{bad json' }))

    const output: unknown = await good.generateAdvice(validWonSummary, { signal: new AbortController().signal })
    expect(output).toEqual(JSON.parse(validText))
    await expect(bad.generateAdvice(validWonSummary, { signal: new AbortController().signal })).rejects.toMatchObject({ kind: 'programming' })
  })

  it.each([
    [{ status: 408 }, 'transient'], [{ status: 429 }, 'transient'], [{ status: 503 }, 'transient'],
    [new TypeError('network'), 'transient'], [{ status: 401 }, 'auth'], [{ status: 403 }, 'auth'],
    [{ status: 400, message: 'safety blocked' }, 'safety'], [{ status: 404, message: 'unsupported model' }, 'configuration'],
    [{ status: 400 }, 'permanent'], [{ status: 404 }, 'permanent'],
    [new DOMException('aborted', 'AbortError'), 'client_cancelled'], [{ message: 'unexpected' }, 'programming'],
  ] as const)('maps provider failures to %s safely', async (error, kind) => {
    const provider = new GeminiAiAdviceProvider({ apiKey: 'test-key', model: 'test-model' }, async () => { throw error })
    await expect(provider.generateAdvice(validWonSummary, { signal: new AbortController().signal })).rejects.toMatchObject({ kind } satisfies Partial<ProviderFailure>)
  })

  it('maps an already-aborted supplied signal to client cancellation and exposes no diagnostics sink', async () => {
    const controller = new AbortController()
    controller.abort()
    const provider = new GeminiAiAdviceProvider({ apiKey: 'test-key', model: 'test-model' }, async () => ({ text: validText }))
    await expect(provider.generateAdvice(validWonSummary, { signal: controller.signal })).rejects.toMatchObject({ kind: 'client_cancelled' })
  })

  it('extracts only finite non-negative token counts without payload data', () => {
    expect(extractSafeTokenUsage({ promptTokenCount: 21, candidatesTokenCount: 8, raw: validText })).toEqual({ input: 21, output: 8 })
    expect(extractSafeTokenUsage({ promptTokenCount: -1, candidatesTokenCount: Number.NaN })).toBeUndefined()
  })
})
