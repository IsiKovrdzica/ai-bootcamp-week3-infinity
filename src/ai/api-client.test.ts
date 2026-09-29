import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createAdviceTransport } from './api-client'
import type { AiAdvice, GameSummary } from './contracts'

const summary: GameSummary = {
  outcome: 'WON',
  score: 320,
  bricksDestroyed: 32,
  livesRemaining: 2,
  livesLost: 1,
  durationSeconds: 42.5,
}

const advice: AiAdvice = {
  summary: 'You cleared the board.',
  recommendation: 'Keep tracking the ball early.',
  category: 'consistency',
}

describe('browser advice transport', () => {
  it('posts the exact GameSummary to the relative advice route and parses exact valid advice', async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []
    const transport = createAdviceTransport(async (input, init) => {
      calls.push({ input, init })
      return jsonResponse(advice, 200)
    })

    await expect(transport(summary)).resolves.toEqual({ ok: true, advice })
    expect(calls).toHaveLength(1)
    expect(calls[0].input).toBe('/api/ai/advice')
    expect(calls[0].init).toMatchObject({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(summary),
    })
  })

  it.each([400, 503])('maps HTTP %i to one safe browser failure', async (status) => {
    const transport = createAdviceTransport(async () =>
      jsonResponse({ error: { internal: 'not for callers' } }, status),
    )

    await expect(transport(summary)).resolves.toEqual({ ok: false })
  })

  it('maps rejected fetch and malformed success content to the same safe failure', async () => {
    const rejected = createAdviceTransport(async () => {
      throw new Error('network details')
    })
    const malformed = createAdviceTransport(async () =>
      jsonResponse({ ...advice, providerDetail: 'untrusted' }, 200),
    )

    await expect(rejected(summary)).resolves.toEqual({ ok: false })
    await expect(malformed(summary)).resolves.toEqual({ ok: false })
  })

  it('keeps browser AI modules free of server, provider, and environment references', () => {
    for (const sourceUrl of [
      new URL('./api-client.ts', import.meta.url),
      new URL('./coach-controller.ts', import.meta.url),
    ]) {
      const source = readFileSync(sourceUrl, 'utf8')
      expect(source).not.toMatch(/server\//)
      expect(source).not.toMatch(/@google\/genai/)
      expect(source).not.toMatch(/GEMINI_API_KEY/)
      expect(source).not.toMatch(/GEMINI_MODEL/)
      expect(source).not.toMatch(/prompt|configuration/i)
    }
  })
})

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
