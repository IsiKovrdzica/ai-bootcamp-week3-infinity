import { describe, expect, it } from 'vitest'
import { validWonSummary } from './game-summary-fixtures.js'
import {
  buildPostGameCoachPrompt,
  POST_GAME_COACH_PROMPT_VERSION,
} from './prompt.js'

describe('BrickPulse post-game coach prompt', () => {
  it('uses the fixed version and all six summary fields as the only game data', () => {
    const prompt = buildPostGameCoachPrompt(validWonSummary)

    expect(POST_GAME_COACH_PROMPT_VERSION).toBe('brickpulse-post-game-coach/v1')
    for (const [field, value] of Object.entries(validWonSummary)) {
      expect(prompt).toContain(field)
      expect(prompt).toContain(String(value))
    }
    expect(prompt).not.toMatch(/paddle|ball|brick(?:s)?\s*:\s*\[/i)
  })

  it('requires exact bounded advice JSON and forbids invented events, secrets, tools, and history', () => {
    const prompt = buildPostGameCoachPrompt(validWonSummary)

    expect(prompt).toMatch(/do not invent/i)
    expect(prompt).toContain('summary')
    expect(prompt).toContain('recommendation')
    expect(prompt).toContain('category')
    for (const category of ['survival', 'efficiency', 'consistency', 'general']) {
      expect(prompt).toContain(category)
    }
    expect(prompt).toContain('160')
    expect(prompt).toContain('220')
    expect(prompt).not.toMatch(/api[_ -]?key|gemini_model|environment|tool|conversation history/i)
  })
})
