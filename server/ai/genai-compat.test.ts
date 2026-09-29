import { GoogleGenAI } from '@google/genai'
import { describe, expect, it } from 'vitest'

const adviceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'recommendation', 'category'],
  properties: {
    summary: { type: 'string' },
    recommendation: { type: 'string' },
    category: {
      type: 'string',
      enum: ['survival', 'efficiency', 'consistency', 'general'],
    },
  },
}

describe('@google/genai 2.24.0 offline compatibility', () => {
  it('uses one total transport attempt when retryOptions.attempts is 1', async () => {
    let transportAttempts = 0
    const ai = createClient(async () => {
      transportAttempts += 1
      return new Response(JSON.stringify({ error: { message: 'unavailable' } }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      })
    })

    await expect(ai.models.generateContent({
      model: 'test-model',
      contents: 'offline test input',
      config: { httpOptions: { retryOptions: { attempts: 1 } } },
    })).rejects.toThrow()

    expect(transportAttempts).toBe(1)
  })

  it('forwards caller cancellation to the transport signal', async () => {
    const controller = new AbortController()
    let transportSignal: AbortSignal | null | undefined
    let markTransportEntered: (() => void) | undefined
    const transportEntered = new Promise<void>((resolve) => {
      markTransportEntered = resolve
    })
    const ai = createClient((_input, init) => {
      transportSignal = init?.signal
      markTransportEntered?.()
      return new Promise<Response>((_resolve, reject) => {
        transportSignal?.addEventListener(
          'abort',
          () => reject(new DOMException('aborted', 'AbortError')),
          { once: true },
        )
      })
    })

    const pending = ai.models.generateContent({
      model: 'test-model',
      contents: 'offline test input',
      config: {
        abortSignal: controller.signal,
        httpOptions: { retryOptions: { attempts: 1 } },
      },
    })
    await transportEntered
    controller.abort()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(transportSignal?.aborted).toBe(true)
  })

  it('requests structured JSON and exposes text plus safe usage metadata', async () => {
    let requestBody: unknown
    const ai = createClient(async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as unknown
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            role: 'model',
            parts: [{
              text: '{"summary":"Reviewed.","recommendation":"Track the ball.","category":"general"}',
            }],
          },
          finishReason: 'STOP',
        }],
        usageMetadata: {
          promptTokenCount: 21,
          candidatesTokenCount: 8,
          totalTokenCount: 29,
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    const response = await ai.models.generateContent({
      model: 'test-model',
      contents: 'offline test input',
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: adviceSchema,
        httpOptions: { retryOptions: { attempts: 1 } },
      },
    })

    expect(requestBody).toMatchObject({
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: adviceSchema,
      },
    })
    expect(response.text).toBe('{"summary":"Reviewed.","recommendation":"Track the ball.","category":"general"}')
    expect(response.usageMetadata).toMatchObject({
      promptTokenCount: 21,
      candidatesTokenCount: 8,
      totalTokenCount: 29,
    })
  })
})

function createClient(fetch: typeof globalThis.fetch) {
  return new GoogleGenAI({
    apiKey: 'offline-test-key',
    httpOptions: { fetch },
  })
}
