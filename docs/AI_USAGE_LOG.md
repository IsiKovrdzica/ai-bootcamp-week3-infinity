# AI Usage Log — BrickPulse Week04

This concise log records important AI-assisted engineering and live-provider
verification steps. It does not contain private chain-of-thought, an API key,
secret, raw provider payload, raw prompt, stack trace, or private environment
value.

| Faza | Zašto je AI korišćen | Šta se očekivalo | Rezultat | Sledeća odluka |
| ---- | -------------------- | ---------------- | -------- | -------------- |
| Spec / planiranje | Definisati Post-Game AI Coach opseg, frontend/backend/provider granice, ugovore, timeout/retry politiku i fake-first pristup. | Odobren, ograničen Week04 plan bez izmene Week03 gameplay-a. | SpecKit `spec.md`, `plan.md` i `tasks.md` su uspostavljeni. | Implementirati po fazama uz determinističke testove. |
| Ugovori / validacija | Uspostaviti tačnu runtime validaciju `GameSummary` / `AiAdvice` i odbijanje neispravnog lokalnog ulaza bez provider poziva. | Neispravan ulaz vraća bezbedan 400 i nula provider poziva. | Deterministički validation testovi su zeleni. | Zadržati runtime granicu pre providera. |
| Fake provider / pouzdanost | Proveriti uspeh, trajni/prolazni neuspeh, neispravan izlaz, zajednički rok od 15 s, najviše 2 aplikaciona pokušaja i 250 ms retry odlaganje. | Ograničeni, bezbedni i ponovljivi offline ishodi. | Offline reliability testovi su zeleni. | Zadržati retry/deadline u application service sloju. |
| SDK kompatibilnost | Proveriti `@google/genai` structured JSON, `AbortSignal` i `retryOptions.attempts: 1`. | Jedan SDK transport pokušaj po provider pozivu. | Compatibility gate je prošao; SDK adapter je zadržan. | Gemini ostaje jedini backend adapter. |
| Frontend vlasništvo zahteva | Proveriti eksplicitan post-game zahtev, jedan in-flight zahtev, abort pri restartu i odbijanje zastarelog uspeha/neuspeha. | AI zahtev je eksplicitan i session-safe. | Controller/browser testovi su zeleni. | Zadržati browser ownership logiku nezavisno od backend roka. |
| Cross-boundary integracija | Proveriti browser → `POST /api/ai/advice` → backend → fake provider → validiran browser rezultat, uključujući 400/503 putanje. | Tačni bezbedni odgovori bez Gemini mrežne zavisnosti. | Offline integration testovi su zeleni. | Osloniti se na fake provider za rutinske testove. |
| Potpuna offline verifikacija | Potvrditi kompletnu Core granicu i Week03 regresije. | Deterministička Core verifikacija je zelena. | `npm test` 206/206, smoke 6/6, fokusirani Week03 42/42, formal 5/5, holdout 1/1, typecheck/build/frontend-boundary su prošli. | Core je bio spreman za jednu eksplicitno odobrenu live proveru. |
| Live Gemini verifikacija | Jedna kontrolisana real-provider provera nakon offline gate-a. | Jedan provider poziv i runtime-validan `AiAdvice`. | `FAILED` / `providerCallCount: 1` / `adviceValid: false`. Retry nije izvršen. | Sačuvati stvarni rezultat; ne podešavati niti ponavljati samo radi `PASS`; ograničenje je zabeleženo u evidence. |

## References

- [Week04 specification](../specs/001-brickpulse-ai-coach/spec.md)
- [Week04 tasks](../specs/001-brickpulse-ai-coach/tasks.md)
- [Week04 evidence](EVIDENCE_W04.md)
- [Sanitized usage event contract](../server/ai/usage-log.ts)
- [Live verification script](../scripts/verify-gemini.ts)
