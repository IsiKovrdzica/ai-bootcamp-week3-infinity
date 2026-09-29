# Data Model: BrickPulse Post-Game AI Coach

## Existing entity extension

### `GameState`

Existing fields remain unchanged. Add only:

| Field | Type | Initial value | Update rule |
|---|---|---:|---|
| `durationSeconds` | finite non-negative number | `0` | Add finite non-negative processed simulation slice time only while entering that slice in `RUNNING`; preserve across non-final life loss; freeze in terminal states; reset on full restart |

The value is simulation time supplied to and processed by `updateGame`, not a new wall clock. A telemetry-only guard ignores negative or non-finite deltas for accumulation so the counter itself cannot become invalid; it does not change how existing physics consumes `deltaSeconds` and does not alter physics or state transitions.

## Public request entity

### `GameSummary`

| Field | Type | Derivation | Validation |
|---|---|---|---|
| `outcome` | `WON | GAME_OVER` | terminal `state.status` | exact enum |
| `score` | number | `state.score` | finite non-negative integer; equals destroyed bricks × 10 |
| `bricksDestroyed` | number | count of `!brick.alive` | integer 0–32; exactly 32 for `WON` |
| `livesRemaining` | number | `state.lives` | integer 0–3; exactly 0 for `GAME_OVER` |
| `livesLost` | number | `state.config.lives - state.lives` | integer 0–3; sum with remaining equals 3 |
| `durationSeconds` | number | `state.durationSeconds` | finite and non-negative |

The body is exactly this object. It has no identifier, envelope, player data, full brick array, ball/paddle state, or persistent representation.

## Public success entity

### `AiAdvice`

| Field | Type | Validation |
|---|---|---|
| `summary` | string | non-whitespace, 1–160 characters |
| `recommendation` | string | non-whitespace, 1–220 characters |
| `category` | enum | `survival | efficiency | consistency | general` |

The provider result is `unknown` until strict validation succeeds. Missing and extra fields are rejected.

## Public error entities

### Invalid summary

```json
{
  "error": {
    "code": "INVALID_GAME_SUMMARY",
    "message": "Invalid game summary."
  }
}
```

### Advice unavailable

```json
{
  "error": {
    "code": "AI_ADVICE_UNAVAILABLE",
    "message": "AI advice is temporarily unavailable. Please try again later."
  }
}
```

Both projections have exact keys and contain no diagnostic field.

## Backend-only operational values

### `ProviderFailure`

| Kind | Retryable | Examples |
|---|---:|---|
| `transient` | yes, once if deadline remains | connection failure, 408, 429, 5xx |
| `auth` | no | invalid/unauthorized credential |
| `configuration` | no | missing model/key, unsupported model |
| `safety` | no | provider refusal/safety block |
| `client_cancelled` | no | caller/request abort |
| `permanent` | no | other provider 4xx |
| `programming` | no | unexpected application/adapter fault |

Raw provider errors never cross the service boundary.

### `AiUsageEvent`

Ephemeral sanitized diagnostic event only:

| Field | Type | Notes |
|---|---|---|
| `provider` | literal `gemini` or `fake` | no credential |
| `model` | string | configured identifier; fake may use `fake` |
| `timestamp` | ISO string | backend-generated |
| `latencyMs` | non-negative number | whole request operation |
| `outcome` | `success | failure | timeout` | sanitized |
| `attemptCount` | `1 | 2` | one event is emitted only for an actual provider attempt; invalid local input emits no event |
| `tokenUsage` | optional numeric summary | only when safely exposed by SDK; no payload |

No database or history entity is created. Default logging is one sanitized structured line/event sink suitable for test injection.

## Frontend state model

```text
hidden --terminal game--> idle
idle --explicit click--> pending
pending --validated 200--> success
pending --safe error/network failure--> failure
success/failure --explicit click--> pending
any --full restart--> hidden (increment session, abort request, clear output)
```

`pending` ignores additional clicks. Every request captures the current game-session identifier; only a matching current session may update the view.
