import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const forbidden = [
  '@google/genai',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'GeminiAiAdviceProvider',
  'brickpulse-post-game-coach/v1',
  'server/',
]

const bundle = readFiles('dist').join('\n')
const configuredKey = process.env.GEMINI_API_KEY?.trim()
if (
  forbidden.some((identifier) => bundle.includes(identifier)) ||
  (configuredKey !== undefined && configuredKey.length > 0 && bundle.includes(configuredKey))
) {
  throw new Error('Frontend bundle contains a backend-only identifier.')
}

console.log('Frontend bundle boundary passed.')

function readFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? readFiles(path) : [readFileSync(path, 'utf8')]
  })
}
