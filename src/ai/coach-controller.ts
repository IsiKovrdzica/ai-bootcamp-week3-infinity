import type { AiAdvice, GameSummary } from './contracts.js'
import type { AdviceTransport } from './api-client.js'

export type CoachState =
  | { kind: 'hidden' }
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'success'; advice: AiAdvice }
  | { kind: 'failure' }

export type CoachControllerOptions = {
  transport: AdviceTransport
  onStateChange: (state: CoachState) => void
}

export class CoachController {
  private readonly options: CoachControllerOptions
  private stateValue: CoachState = { kind: 'hidden' }
  private summary: Readonly<GameSummary> | undefined
  private sessionValue = 0
  private requestId = 0
  private inFlight: AbortController | undefined

  constructor(options: CoachControllerOptions) {
    this.options = options
    this.options.onStateChange(this.stateValue)
  }

  showTerminal(summary: Readonly<GameSummary>): void {
    this.summary = summary
    if (this.stateValue.kind === 'hidden') this.setState({ kind: 'idle' })
  }

  requestAdvice(): void {
    if (!this.summary || this.inFlight) return
    if (
      this.stateValue.kind !== 'idle' &&
      this.stateValue.kind !== 'success' &&
      this.stateValue.kind !== 'failure'
    ) return

    const controller = new AbortController()
    const sessionId = this.sessionValue
    const requestId = ++this.requestId
    this.inFlight = controller
    this.setState({ kind: 'pending' })

    let pending: Promise<import('./api-client.js').AdviceTransportResult>
    try {
      pending = this.options.transport(this.summary, { signal: controller.signal })
    } catch {
      pending = Promise.resolve({ ok: false })
    }
    void pending.then(
      (result) => this.settle(sessionId, requestId, result),
      () => this.settle(sessionId, requestId, { ok: false }),
    )
  }

  restart(): void {
    this.inFlight?.abort()
    this.inFlight = undefined
    this.summary = undefined
    this.sessionValue += 1
    this.setState({ kind: 'hidden' })
  }

  get state(): CoachState {
    return this.stateValue
  }

  get sessionId(): number {
    return this.sessionValue
  }

  private settle(
    sessionId: number,
    requestId: number,
    result: import('./api-client.js').AdviceTransportResult,
  ): void {
    if (sessionId !== this.sessionValue || requestId !== this.requestId) return
    this.inFlight = undefined
    this.setState(result.ok ? { kind: 'success', advice: result.advice } : { kind: 'failure' })
  }

  private setState(state: CoachState): void {
    this.stateValue = state
    this.options.onStateChange(state)
  }
}
