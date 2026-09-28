# Provider Boundary Contract

## Application-facing interface

```ts
interface AiAdviceProvider {
  generateAdvice(
    summary: Readonly<GameSummary>,
    options: { signal: AbortSignal },
  ): Promise<unknown>;
}
```

- The service passes only a previously validated `GameSummary`.
- Provider output is deliberately `unknown`.
- The provider receives cancellation but owns no retry policy.
- Provider-specific errors are mapped to the closed internal failure classes in `data-model.md`.

## Fake provider modes

| Mode | Behavior |
|---|---|
| `success` | Return exact valid `AiAdvice` |
| `permanentFailure` | Throw normalized non-retryable failure |
| `transientFailure` | Throw normalized retryable failure every call |
| `transientThenSuccess` | First call transient; second returns valid advice |
| `delayed` | Remain pending until injected clock/deferred control releases or signal aborts |
| `malformed` | Return configured unknown value |

Every invocation increments `providerCallCount` synchronously at method entry.

## Gemini provider responsibilities

- Construct the SDK client from backend-only configuration.
- Use exactly the configured `GEMINI_MODEL`.
- Apply prompt version `brickpulse-post-game-coach/v1`.
- Request structured JSON and disable/account for SDK automatic retries so one method call is one external attempt.
- Pass through the supplied abort signal.
- Return parsed JSON as `unknown`; never claim it is valid `AiAdvice`.
- Normalize provider failures without exposing raw details.

## Service responsibilities

- Own the shared 15-second deadline and optional second attempt.
- Retry only normalized `transient` failures.
- Strictly validate output after each successful provider return.
- Emit only validated `AiAdvice` or the application-owned unavailable result.
- Record a sanitized `AiUsageEvent` through an injected sink.
