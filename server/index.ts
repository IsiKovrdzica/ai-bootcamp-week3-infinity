import { createServer } from 'node:http'
import { createApp, createNodeHttpHandler } from './app.js'
import type { AdviceService } from './ai/advice-service.js'

const host = '127.0.0.1'
const port = Number(process.env.PORT ?? 8787)

const unavailableService: AdviceService = {
  async requestAdvice() {
    return { ok: false, kind: 'unavailable' }
  },
}

const server = createServer(
  createNodeHttpHandler(createApp(unavailableService)),
)

server.listen(port, host, () => {
  console.log(`BrickPulse API listening on http://${host}:${port}`)
})
