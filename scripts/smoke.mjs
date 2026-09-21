import { spawn } from 'node:child_process'

const host = process.env.SMOKE_HOST ?? '127.0.0.1'
const port = process.env.SMOKE_PORT ?? '4173'
const baseUrl = (process.env.SMOKE_URL ?? `http://${host}:${port}`).replace(/\/+$/, '')
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', host, '--port', port], {
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverOutput = ''
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString()
})
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString()
})

const stopServer = () => {
  if (!server.killed) {
    server.kill('SIGTERM')
  }
}

const checks = [
  ['page loads', '/', 200, (body) => body.includes('<title>BrickPulse</title>')],
  ['Canvas contract', '/', 200, (body) => (
    body.includes('id="game"')
    && body.includes('width="640"')
    && body.includes('height="480"')
  )],
  ['module entrypoint loads', '/src/main.ts', 200, (body) => (
    body.includes('createGame')
    && body.includes('renderGame')
  )],
]

console.log(`Temporary smoke target: ${baseUrl}`)
console.log('This server is used only for automated checks and will stop when the command finishes.')
let failures = 0

try {
  await waitForServer()

  for (const [name, path, expectedStatus, validate] of checks) {
    try {
      const response = await fetch(`${baseUrl}${path}`)
      const body = await response.text()
      assert(response.status === expectedStatus, `expected ${expectedStatus}, got ${response.status}`)
      assert(validate(body), 'response body did not match the expected contract')
      console.log(`PASS  ${name}`)
    } catch (error) {
      failures += 1
      console.error(`FAIL  ${name}`)
      console.error(`      ${error instanceof Error ? error.message : String(error)}`)
    }
  }
} catch (error) {
  failures = checks.length
  console.error('Smoke failed: the Vite server did not become available.')
  console.error(`      ${error instanceof Error ? error.message : String(error)}`)
  if (serverOutput.trim()) {
    console.error(serverOutput.trim())
  }
} finally {
  stopServer()
}

if (failures > 0) {
  console.error(`Smoke failed: ${failures}/${checks.length} checks failed.`)
  process.exitCode = 1
} else {
  console.log(`Smoke passed: ${checks.length}/${checks.length} checks passed.`)
}

console.log('Temporary smoke server stopped. Run `npm run dev` to open the game manually.')

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok) {
        return
      }
    } catch {
      // Vite may need a moment to start listening.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Vite did not serve ${baseUrl}`)
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}
