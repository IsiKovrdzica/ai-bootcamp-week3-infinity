import type {
  IncomingMessage,
  ServerResponse,
} from 'node:http'
import {
  AI_ADVICE_UNAVAILABLE_ERROR,
  INVALID_GAME_SUMMARY_ERROR,
} from '../src/ai/contracts.js'
import type { AdviceService } from './ai/advice-service.js'
import { validateGameSummary } from './ai/validation.js'

export const MAX_REQUEST_BODY_BYTES = 16 * 1024

export type AppRequest = {
  method: string
  path: string
  body: string
}

export type AppResponse = {
  status: number
  headers: Record<string, string>
  body: string
}

export type AppHandler = (request: AppRequest) => Promise<AppResponse>

function jsonResponse(status: number, body: unknown): AppResponse {
  return {
    status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

function invalidSummaryResponse(): AppResponse {
  return jsonResponse(400, INVALID_GAME_SUMMARY_ERROR)
}

function unavailableResponse(): AppResponse {
  return jsonResponse(503, AI_ADVICE_UNAVAILABLE_ERROR)
}

export function createApp(service: AdviceService): AppHandler {
  return async (request) => {
    if (request.path !== '/api/ai/advice') {
      return jsonResponse(404, { error: { code: 'NOT_FOUND' } })
    }
    if (request.method !== 'POST') {
      return jsonResponse(405, { error: { code: 'METHOD_NOT_ALLOWED' } })
    }
    if (Buffer.byteLength(request.body, 'utf8') > MAX_REQUEST_BODY_BYTES) {
      return invalidSummaryResponse()
    }

    let parsedBody: unknown
    try {
      parsedBody = JSON.parse(request.body)
    } catch {
      return invalidSummaryResponse()
    }

    const summaryValidation = validateGameSummary(parsedBody)
    if (!summaryValidation.ok) {
      return invalidSummaryResponse()
    }

    try {
      const result = await service.requestAdvice(summaryValidation.value)
      if (!result.ok) {
        return result.kind === 'invalid_summary'
          ? invalidSummaryResponse()
          : unavailableResponse()
      }

      const { summary, recommendation, category } = result.advice
      return jsonResponse(200, { summary, recommendation, category })
    } catch {
      return unavailableResponse()
    }
  }
}

export function createNodeHttpHandler(handler: AppHandler) {
  return (request: IncomingMessage, response: ServerResponse): void => {
    const chunks: Buffer[] = []
    let byteLength = 0
    let responded = false

    const write = (result: AppResponse) => {
      if (responded) return
      responded = true
      response.writeHead(result.status, result.headers)
      response.end(result.body)
    }

    request.on('data', (chunk: Buffer) => {
      byteLength += chunk.length
      if (byteLength > MAX_REQUEST_BODY_BYTES) {
        request.resume()
        write(invalidSummaryResponse())
        return
      }
      chunks.push(chunk)
    })

    request.on('error', () => {
      write(invalidSummaryResponse())
    })

    request.on('end', () => {
      if (responded) return
      void handler({
        method: request.method ?? '',
        path: request.url ?? '',
        body: Buffer.concat(chunks).toString('utf8'),
      }).then(write, () => write(unavailableResponse()))
    })
  }
}
