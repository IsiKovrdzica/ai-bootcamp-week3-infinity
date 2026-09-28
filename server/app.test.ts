import { describe, expect, it } from 'vitest'
import { createAdviceService } from './ai/advice-service.js'
import { FakeAiAdviceProvider } from './ai/fake-provider.js'
import {
  invalidGameSummaryFixtures,
  validWonSummary,
} from './ai/game-summary-fixtures.js'
import { createApp, type AppResponse } from './app.js'
import { ProviderFailure } from './ai/provider.js'

const validAdvice = {
  summary: 'You cleared every brick.',
  recommendation: 'Center the paddle before the next return.',
  category: 'efficiency' as const,
}

const invalidEnvelope = {
  error: {
    code: 'INVALID_GAME_SUMMARY',
    message: 'Invalid game summary.',
  },
}

const unavailableEnvelope = {
  error: {
    code: 'AI_ADVICE_UNAVAILABLE',
    message: 'AI advice is temporarily unavailable. Please try again later.',
  },
}

function body(response: AppResponse): unknown {
  return JSON.parse(response.body)
}

function createFakeApp(options: ConstructorParameters<typeof FakeAiAdviceProvider>[0]) {
  const provider = new FakeAiAdviceProvider(options)
  return { provider, app: createApp(createAdviceService(provider)) }
}

describe('POST /api/ai/advice', () => {
  it('returns exact validated advice for valid JSON and fake success', async () => {
    const { provider, app } = createFakeApp({ mode: 'success', advice: validAdvice })

    const response = await app({
      method: 'POST',
      path: '/api/ai/advice',
      body: JSON.stringify(validWonSummary),
    })

    expect(response.status).toBe(200)
    expect(response.headers).toEqual({ 'content-type': 'application/json' })
    expect(body(response)).toEqual(validAdvice)
    expect(provider.providerCallCount).toBe(1)
  })

  it('returns the exact 400 envelope for malformed JSON with zero provider calls', async () => {
    const { provider, app } = createFakeApp({ mode: 'success', advice: validAdvice })

    const response = await app({
      method: 'POST',
      path: '/api/ai/advice',
      body: '{',
    })

    expect(response.status).toBe(400)
    expect(body(response)).toEqual(invalidEnvelope)
    expect(provider.providerCallCount).toBe(0)
  })

  it.each([null, ...invalidGameSummaryFixtures])(
    'returns exact 400 for invalid local input %# without provider invocation',
    async (invalidInput) => {
      const { provider, app } = createFakeApp({ mode: 'success', advice: validAdvice })

      const response = await app({
        method: 'POST',
        path: '/api/ai/advice',
        body: JSON.stringify(invalidInput),
      })

      expect(response.status).toBe(400)
      expect(body(response)).toEqual(invalidEnvelope)
      expect(provider.providerCallCount).toBe(0)
    },
  )

  it('returns exact 503 without diagnostics for provider failure', async () => {
    const { provider, app } = createFakeApp({ mode: 'permanentFailure' })

    const response = await app({
      method: 'POST',
      path: '/api/ai/advice',
      body: JSON.stringify(validWonSummary),
    })

    expect(response.status).toBe(503)
    expect(body(response)).toEqual(unavailableEnvelope)
    expect(provider.providerCallCount).toBe(1)
  })

  it('returns exact 503 without malformed provider fields', async () => {
    const { provider, app } = createFakeApp({
      mode: 'malformed',
      malformedOutput: { ...validAdvice, providerDetail: 'raw detail' },
    })

    const response = await app({
      method: 'POST',
      path: '/api/ai/advice',
      body: JSON.stringify(validWonSummary),
    })

    expect(response.status).toBe(503)
    expect(body(response)).toEqual(unavailableEnvelope)
    expect(JSON.stringify(body(response))).not.toContain('providerDetail')
    expect(provider.providerCallCount).toBe(1)
  })

  it('rejects a body above 16 KiB before provider invocation', async () => {
    const { provider, app } = createFakeApp({ mode: 'success', advice: validAdvice })

    const response = await app({
      method: 'POST',
      path: '/api/ai/advice',
      body: 'x'.repeat(16 * 1024 + 1),
    })

    expect(response.status).toBe(400)
    expect(body(response)).toEqual(invalidEnvelope)
    expect(provider.providerCallCount).toBe(0)
  })

  it('returns local 404 and 405 responses for unmatched path and method', async () => {
    const { app } = createFakeApp({ mode: 'success', advice: validAdvice })

    await expect(
      app({ method: 'POST', path: '/other', body: '' }),
    ).resolves.toEqual({
      status: 404,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'NOT_FOUND' } }),
    })
    await expect(
      app({ method: 'GET', path: '/api/ai/advice', body: '' }),
    ).resolves.toEqual({
      status: 405,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED' } }),
    })
  })

  it('remains usable after a fake provider failure', async () => {
    const provider = {
      providerCallCount: 0,
      async generateAdvice() {
        this.providerCallCount += 1
        if (this.providerCallCount === 1) throw new ProviderFailure('permanent')
        return validAdvice
      },
    }
    const app = createApp(createAdviceService(provider))

    await expect(
      app({
        method: 'POST',
        path: '/api/ai/advice',
        body: JSON.stringify(validWonSummary),
      }),
    ).resolves.toMatchObject({ status: 503 })

    await expect(
      app({
        method: 'POST',
        path: '/api/ai/advice',
        body: JSON.stringify(validWonSummary),
      }),
    ).resolves.toMatchObject({ status: 200, body: JSON.stringify(validAdvice) })
    expect(provider.providerCallCount).toBe(2)
  })
})
