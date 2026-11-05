# Testing Strategy

> Status: Proposed. No test tooling is installed yet; it is set up in Phase 1 and Phase 2 (see [PLAN.md](../PLAN.md)). Requirement IDs refer to [REQUIREMENTS.md](REQUIREMENTS.md).

## 1. Test levels and tools (proposed)

| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | State machine, `CeremonyService`, permission map, zod schemas, clock-offset maths, countdown rendering maths, audio cue scheduling logic |
| Integration | Vitest + Supertest + `socket.io-client` | Real Express and Socket.IO server on an ephemeral port; auth, REST endpoints, socket events, broadcasts, reconnection |
| End-to-end | Playwright | All five interfaces in real browsers against a real server, using multiple browser contexts for tablets, display and admin |
| Real-device | Manual checklist | Actual tablets, display hardware and venue network during rehearsal |
| Static | TypeScript (`strict`), ESLint | Every package, on every change (NFR-013) |

Principles:

- Server time is controlled in unit and integration tests with fake timers (`vi.useFakeTimers`) so countdown and opening tests are deterministic. No test may rely on real sleeps to "wait long enough".
- Integration and end-to-end tests use test-only credentials from a test environment file, never real event credentials.
- No mock data or test-only branches in production code paths. Test doubles live in test files.
- Each bug fixed gets a regression test at the lowest level that reproduces it.

## 2. Core scenarios

| ID | Scenario | Unit | Integration | E2E | Device | Requirements |
|---|---|---|---|---|---|---|
| TS-01 | One guest activates | Yes | Yes | Yes | Yes | FR-010, FR-011, FR-016, FR-020, FR-030 |
| TS-02 | Two guests activate | Yes | Yes | Yes | | FR-016, FR-020, FR-042 |
| TS-03 | All three guests activate | Yes | Yes | Yes | Yes | FR-020, FR-022, FR-023, FR-025, FR-026 |
| TS-04 | Nearly simultaneous activations | Yes | Yes | | Yes | FR-021, NFR-004 |
| TS-05 | Duplicate activation | Yes | Yes | Yes | | FR-014 |
| TS-06 | Unauthorized activation | Yes | Yes | Yes | | FR-002, FR-003, FR-012, NFR-005 |
| TS-07 | Tablet disconnection | | Yes | Yes | Yes | FR-011, FR-015, FR-043 |
| TS-08 | Display refresh | | Yes | Yes | Yes | FR-031, FR-073 |
| TS-09 | Backend disconnection | | Yes | Yes | Yes | FR-043, FR-071, FR-072, NFR-003 |
| TS-10 | Admin reset | Yes | Yes | Yes | | FR-046 |
| TS-11 | Admin abort | Yes | Yes | Yes | | FR-027, FR-030, FR-044 |
| TS-12 | Audio unavailable | Yes | | Yes | Yes | FR-060, FR-061, FR-062, FR-063 |
| TS-13 | Reconnection and state recovery | | Yes | Yes | Yes | FR-031, FR-051, FR-071, FR-073, NFR-003 |
| TS-14 | Exactly-once countdown | Yes | Yes | | | FR-021, FR-025, NFR-004 |

### TS-01: One guest activates

- Setup: state `COLLECTING_ACTIVATIONS`, no activations.
- Action: `chief` sends `guest:activate`.
- Expect: ack `ok: true`; `activations.chief.activatedAt` set; `version` incremented; `guest:activated` broadcast with `activatedCount: 1`; state stays `COLLECTING_ACTIVATIONS`; no `event:countdown-started`. Display lights only the chief indicator. The chief tablet shows "Activated" only after the ack.

### TS-02: Two guests activate

- Action: `chief` then `dean` activate (and every other ordering in unit tests).
- Expect: two activations recorded; state stays `COLLECTING_ACTIVATIONS`; no countdown; admin shows both as activated with times.

### TS-03: All three guests activate

- Action: the three guests activate in each of the 6 possible orders (unit), one order end-to-end.
- Expect: on the third accepted activation, state becomes `COUNTDOWN` with `trigger: "ALL_ACTIVATED"`, `durationMs: 5000`, `startsAt = acceptedAt + preparationDelayMs`, `opensAt = startsAt + durationMs`. Advancing fake time to `opensAt` produces `OPENED` and one `event:opened`. Display runs countdown, opening animation, then opening screen.
- Variant: with `PREPARATION_DELAY_MS` set, `startsAt` is shifted accordingly.

### TS-04: Nearly simultaneous activations

- Unit: call `activate` for all three roles in the same tick; repeat at least 1000 times with randomized order.
- Integration: three socket clients emit `guest:activate` in the same event-loop turn (`Promise.all`); repeat at least 100 times.
- Expect every iteration: exactly three accepted activations, exactly one `COUNTDOWN` transition, exactly one `event:countdown-started`, exactly one opening timer.

### TS-05: Duplicate activation

- Action: `chief` activates, then activates again from the same socket and from a second socket with a `chief` session.
- Expect: second and third requests get `ALREADY_ACTIVATED` with the original `activatedAt`; `version` unchanged; no extra `guest:activated`; a rejected-activation activity entry is logged.

### TS-06: Unauthorized activation

- Cases: no session (connection refused, `UNAUTHORIZED`); `display` session (`FORBIDDEN`); `admin` session (`FORBIDDEN`); `dean` session sending `{ role: "chief" }` (`VALIDATION_ERROR`, nothing recorded); expired or tampered token (`UNAUTHORIZED`); wrong access code at login (`UNAUTHORIZED`, generic message).
- Expect: state and `version` unchanged in every case.

### TS-07: Tablet disconnection

- Case A: `chief` activates, then the tablet's socket disconnects. Expect the activation remains; `device:status` shows `chief` disconnected; on reconnect the tablet shows "Activated".
- Case B: tablet disconnects before activating, reconnects during `COLLECTING_ACTIVATIONS`. Expect the slider is enabled again.
- Case C: disconnect after sending `guest:activate` but before the ack arrives. Expect the tablet shows "Reconnecting"; after reconnect it renders the server truth (activated or not) from `event:state`.

### TS-08: Display refresh

- Refresh the display in each state. Expect the correct screen for each state after reconnect. During `COUNTDOWN`, the countdown resumes at the correct remaining time (within NFR-002). After `OPENED`, the final opening screen shows without replaying the full animation.

### TS-09: Backend disconnection

- Stop or block the server briefly (integration: close and restart the Socket.IO server on the same port; device: disable network).
- Expect: all clients show "Reconnecting"; no client advances the ceremony; after restoration clients reconnect within 5 s and render state within 1 s (NFR-003).
- Process restart: confirm and document that in-memory state resets to `WAITING` (see open decision in [ARCHITECTURE.md](ARCHITECTURE.md#11-open-decisions)).

### TS-10: Admin reset

- Reset from `READY`, `COLLECTING_ACTIVATIONS` (with partial activations), `OPENED` and `ABORTED`. Expect `WAITING`, cleared activations and countdown, new `runId`, `event:reset` broadcast, sessions still valid.
- Reset from `WAITING` or `COUNTDOWN`: `INVALID_TRANSITION`.
- Non-admin reset: `FORBIDDEN`.

### TS-11: Admin abort

- Abort from `READY`, `COLLECTING_ACTIVATIONS` and `COUNTDOWN`. Expect `ABORTED` and `event:aborted`.
- Abort during `COUNTDOWN`: advancing time past `opensAt` produces no `OPENED` and no `event:opened`; display stops countdown and audio and shows the neutral screen.
- Abort from `WAITING` or `OPENED`: `INVALID_TRANSITION`.

### TS-12: Audio unavailable

- Cases: audio not unlocked; audio file missing (404); decode error; audio element throws on play.
- Expect: countdown, opening animation and opening screen complete on schedule; failure logged; display shows audio status to operators.

### TS-13: Reconnection and state recovery

- For each state, disconnect each client type and reconnect. Expect a full `event:state` on reconnect; clients discard events with lower `version` or stale `runId`; clock sync re-runs on reconnect.
- Missed-event case: client offline while two transitions happen. Expect it renders the latest state correctly from the snapshot alone.

### TS-14: Exactly-once countdown

- Expect exactly one `COUNTDOWN` transition and one `event:opened` per run across: all activation orders, simultaneous activations, duplicate activations after countdown starts, activation attempts during `COUNTDOWN` (`INVALID_TRANSITION`), manual start after automatic start (`INVALID_TRANSITION`), and a stale opening timer after reset (ignored because `runId` changed).

## 3. Additional scenarios

| ID | Scenario | Levels | Requirements |
|---|---|---|---|
| TS-15 | Every invalid state transition is rejected (exhaustive matrix of state x action) | Unit, Integration | FR-040, FR-041, FR-050 |
| TS-16 | Activation outside `COLLECTING_ACTIVATIONS` is rejected; slider disabled in those states | Unit, Integration, E2E | FR-010, FR-013 |
| TS-17 | Manual start: success path; wrong phrase; wrong password; non-admin; wrong state; rate limit; audit entries for all | Unit, Integration, E2E | FR-004, FR-045, FR-047, NFR-005, NFR-012 |
| TS-18 | Countdown synchronization accuracy: clock offset estimate with simulated skew and latency; two browsers show digit changes within 100 ms | Unit, E2E, Device | FR-022, FR-024, NFR-002 |
| TS-19 | Authentication flows and route access for all five roles; configurable server URL | Integration, E2E | FR-001, FR-002, FR-003, FR-004, FR-070 |
| TS-20 | Rate limits on auth, admin and socket events | Integration | NFR-005 |
| TS-21 | Accessibility: keyboard and screen-reader operation of slider alternative and admin; contrast; reduced motion; touch target sizes (automated axe checks plus manual) | E2E, Device | FR-017, NFR-007, NFR-008 |
| TS-22 | Venue performance and endurance: latency, readability from the back of the venue, browser compatibility, 8-hour soak | Device | NFR-001, NFR-006, NFR-007, NFR-010, NFR-011 |
| TS-23 | Offline assets: with internet blocked, all fonts, images and audio load | E2E, Device | NFR-009 |

## 4. Expectations by level

### Unit

- 100% branch coverage of the state machine transition table and `CeremonyService`.
- Pure functions for clock offset and countdown remaining time, tested with edge cases (negative remaining, large skew).

### Integration

- Spin up the real server in-process with test configuration; connect real Socket.IO clients with real session cookies.
- Assert on both acknowledgements and broadcasts received by other clients.
- Verify error envelopes and HTTP status codes match [API_SPECIFICATION.md](API_SPECIFICATION.md).

### End-to-end

- One Playwright test runs the full ceremony: admin prepares and starts, three tablet contexts slide, display shows countdown and opening.
- Additional E2E tests for display refresh, abort, reset and audio failure.
- Run against a production build (`next build` output), not only the dev server.

### Real-device

- Run on the actual tablets, display hardware and the chosen venue network.
- Use the rehearsal checklist below.

## 5. Venue rehearsal checklist

- [ ] Network chosen and recorded; all devices reach `GET /api/health`.
- [ ] Server address configured; no hardcoded IPs.
- [ ] Tablets logged in with event credentials; display logged in; admin logged in.
- [ ] Tablets: screen lock and auto-sleep disabled; brightness fixed; browser in fullscreen or kiosk mode; notifications silenced.
- [ ] Display: fullscreen, correct resolution, audio unlocked, volume checked at the venue.
- [ ] Full ceremony run three times, including one with deliberately staggered activations.
- [ ] Simultaneous activation run (all three guests on cue).
- [ ] Display refresh during countdown.
- [ ] Tablet Wi-Fi toggled off and on after activation.
- [ ] Abort and reset run.
- [ ] Manual start procedure rehearsed by the authorized person.
- [ ] Server restart behaviour understood by operators.
- [ ] Credentials rotated after rehearsal.
