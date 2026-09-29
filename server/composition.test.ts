import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { createProductionAdviceService } from './composition.js'
import { validWonSummary } from './ai/game-summary-fixtures.js'

describe('production advice composition', () => {
  it('maps missing backend Gemini configuration through the existing safe 503 response', async () => {
    const app = createApp(createProductionAdviceService({}))
    const response = await app({
      method: 'POST',
      path: '/api/ai/advice',
      body: JSON.stringify(validWonSummary),
    })

    expect(response).toEqual({
      status: 503,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: {
          code: 'AI_ADVICE_UNAVAILABLE',
          message: 'AI advice is temporarily unavailable. Please try again later.',
        },
      }),
    })
  })
})
