# Requirements

> Status: Proposed baseline. Requirement IDs are stable. Do not renumber; deprecate instead.
> Test scenario IDs (`TS-xx`) refer to [TESTING_STRATEGY.md](TESTING_STRATEGY.md).

Conventions:

- **MUST** is mandatory. **SHOULD** is expected unless a documented reason exists. **MAY** is optional.
- "Accepted activation" means an activation that the server has validated and recorded. Client-side gestures alone are never activations.
- Role IDs: `chief`, `vice-chancellor`, `dean` (guests), `display`, `admin`.
- States: `WAITING`, `READY`, `COLLECTING_ACTIVATIONS`, `COUNTDOWN`, `OPENED`, `ABORTED`.

## 1. Functional requirements

### Interfaces and access

| ID     | Requirement                                                                                                                                                                                                              | Tests        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| FR-001 | The web app MUST provide the routes `/` (ceremony display), `/guest/chief`, `/guest/vice-chancellor`, `/guest/dean` and `/admin`. The display is a browser page. A projector only mirrors or extends that laptop screen. | TS-19        |
| FR-002 | Each guest tablet MUST authenticate with a role-specific access credential issued by the server. A guest route MUST NOT allow ceremony actions until a valid session for that same role exists.                          | TS-06, TS-19 |
| FR-003 | The main display MUST authenticate with a display credential and MUST only receive read access (no ceremony actions).                                                                                                    | TS-06, TS-19 |
| FR-004 | The admin dashboard MUST authenticate with an admin credential before showing controls or data.                                                                                                                          | TS-17, TS-19 |

### Guest activation

| ID     | Requirement                                                                                                                                                                                              | Tests        |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| FR-010 | A guest tablet MUST present a slide-to-activate control that is enabled only while the server state is `COLLECTING_ACTIVATIONS` and that guest has no accepted activation.                               | TS-01, TS-16 |
| FR-011 | Completing the slide MUST send exactly one `guest:activate` request. The tablet MUST show a pending state until the server acknowledges, and MUST show "activated" only after the server accepts.        | TS-01, TS-07 |
| FR-012 | The server MUST derive the guest role from the authenticated session, never from the request payload.                                                                                                    | TS-06        |
| FR-013 | The server MUST reject activations when the state is not `COLLECTING_ACTIVATIONS` with error `INVALID_TRANSITION`.                                                                                       | TS-16        |
| FR-014 | The server MUST reject a second activation from an already-activated role with `ALREADY_ACTIVATED` without changing state or emitting new activation events.                                             | TS-05        |
| FR-015 | An accepted activation MUST persist across disconnection, refresh, or re-authentication of the tablet until an admin reset.                                                                              | TS-07        |
| FR-016 | When an activation is accepted, the server MUST broadcast `guest:activated` and an updated `event:state` to all authenticated clients.                                                                   | TS-01, TS-02 |
| FR-017 | Activation sliders MUST be operable as an accessible alternative: keyboard and assistive technologies can complete the slide (for example, via an equivalent button action announced to screen readers). | TS-21        |

### Countdown and opening

| ID     | Requirement                                                                                                                                                                                                   | Tests               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| FR-020 | The server MUST transition to `COUNTDOWN` if and only if all three guest roles have accepted activations while in `COLLECTING_ACTIVATIONS`, or an authorized emergency manual start occurs (FR-045).          | TS-01, TS-02, TS-03 |
| FR-021 | The server MUST start the countdown exactly once per ceremony run, including under nearly simultaneous activations.                                                                                           | TS-04, TS-14        |
| FR-022 | On entering `COUNTDOWN`, the server MUST compute `startsAt = acceptedAt + preparationDelayMs` and `opensAt = startsAt + durationMs`, using the server clock, and broadcast them in `event:countdown-started`. | TS-03, TS-18        |
| FR-023 | `durationMs` MUST default to `5000`. `preparationDelayMs` MUST default to `0` and MAY be configured.                                                                                                          | TS-03               |
| FR-024 | Clients MUST render the countdown from the server timestamps adjusted by an estimated clock offset, not from a locally started timer.                                                                         | TS-18               |
| FR-025 | The server MUST transition to `OPENED` at `opensAt` using its own timer and broadcast `event:opened`. No client may cause this transition.                                                                    | TS-03, TS-14        |
| FR-026 | The main display MUST start the opening animation on `event:opened` and then show the official FIT Expo opening screen.                                                                                       | TS-03               |
| FR-027 | If `ABORTED` is entered during `COUNTDOWN`, the server MUST cancel the pending `OPENED` transition and clients MUST stop countdown visuals and audio.                                                         | TS-11               |

### Main display

| ID     | Requirement                                                                                                                                                                                                                                                                                    | Tests        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| FR-030 | The display MUST show a distinct screen for each state: branded waiting (`WAITING`, `READY`), activation progress with three guest indicators (`COLLECTING_ACTIVATIONS`), countdown (`COUNTDOWN`), opening animation then opening screen (`OPENED`), and a neutral branded screen (`ABORTED`). | TS-01, TS-11 |
| FR-031 | After a refresh or reconnection the display MUST render the current server state within one state update, including resuming a countdown at the correct remaining time, or showing the final opening screen if already `OPENED` (without replaying the full animation).                        | TS-08, TS-13 |

### Admin dashboard

| ID     | Requirement                                                                                                                                                                                                         | Tests        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| FR-040 | Admin MUST be able to prepare the event (`WAITING` to `READY`).                                                                                                                                                     | TS-15        |
| FR-041 | Admin MUST be able to start the activation phase (`READY` to `COLLECTING_ACTIVATIONS`).                                                                                                                             | TS-15        |
| FR-042 | Admin MUST see each guest's activation status and time, live.                                                                                                                                                       | TS-02        |
| FR-043 | Admin MUST see connection status per role (connected or disconnected, number of connections, last seen).                                                                                                            | TS-07, TS-09 |
| FR-044 | Admin MUST be able to abort from `READY`, `COLLECTING_ACTIVATIONS` or `COUNTDOWN`, with confirmation.                                                                                                               | TS-11        |
| FR-045 | Admin MUST be able to perform an emergency manual start from `COLLECTING_ACTIVATIONS` only, requiring an explicit confirmation phrase and re-entry of the admin password. The trigger MUST be recorded as `MANUAL`. | TS-17        |
| FR-046 | Admin MUST be able to reset from `READY`, `COLLECTING_ACTIVATIONS`, `OPENED` or `ABORTED` to `WAITING`, which clears all activations and countdown data.                                                            | TS-10        |
| FR-047 | Admin MUST see an activity log of important events (state transitions, accepted and rejected activations, device connects and disconnects, admin actions).                                                          | TS-17        |

### State machine

| ID     | Requirement                                                                                                                                                     | Tests |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| FR-050 | The server MUST enforce the transitions defined in [ARCHITECTURE.md](ARCHITECTURE.md#5-event-state-management) and reject all others with `INVALID_TRANSITION`. | TS-15 |
| FR-051 | Every state change MUST increment a monotonically increasing `version` included in every state snapshot and event.                                              | TS-13 |

### Audio

| ID     | Requirement                                                                                                                                                                          | Tests |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| FR-060 | The display MUST support ambient music, guest activation sound effects, countdown audio and a final opening sound.                                                                   | TS-12 |
| FR-061 | Audio MUST be unlocked through an explicit operator gesture on the display before the ceremony (browser autoplay restrictions). The display MUST indicate whether audio is unlocked. | TS-12 |
| FR-062 | Audio failure (missing file, decode error, blocked autoplay) MUST NOT delay or prevent the visual sequence, and MUST be logged.                                                      | TS-12 |
| FR-063 | Guest tablets MAY play a short local confirmation sound on accepted activation.                                                                                                      | TS-12 |

### Connectivity

| ID     | Requirement                                                                                        | Tests        |
| ------ | -------------------------------------------------------------------------------------------------- | ------------ |
| FR-070 | The server address MUST be configurable through environment variables; no host or IP is hardcoded. | TS-19        |
| FR-071 | All clients MUST reconnect automatically and request no manual action from guests.                 | TS-09, TS-13 |
| FR-072 | All clients MUST display a connection indicator (connected, reconnecting, disconnected).           | TS-09        |
| FR-073 | On every (re)connection the server MUST push the full current `event:state` to that client.        | TS-08, TS-13 |

## 2. Non-functional requirements

| ID      | Category        | Requirement                                                                                                                                                      | Tests               |
| ------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| NFR-001 | Latency         | On the venue network, a state change MUST reach all connected clients within 500 ms at the 95th percentile.                                                      | TS-22               |
| NFR-002 | Synchronization | After clock synchronization, the countdown digit shown on any two clients MUST change within 100 ms of each other, and within 100 ms of the server schedule.     | TS-18               |
| NFR-003 | Recovery        | After network restoration, a client MUST reconnect within 5 s and render the current state within 1 s of reconnecting.                                           | TS-09, TS-13        |
| NFR-004 | Concurrency     | Three activations arriving within the same 10 ms window MUST result in exactly one `COUNTDOWN` transition, verified over at least 1000 automated iterations.     | TS-04, TS-14        |
| NFR-005 | Security        | Every mutating operation MUST require an authenticated role with permission for that operation. No secret may appear in the repository, client bundles, or logs. | TS-06, TS-17, TS-20 |
| NFR-006 | Readability     | Main display text MUST be legible from the back of the venue: at 1920x1080, body text at least 48 px, countdown numerals at least 40% of viewport height.        | TS-22               |
| NFR-007 | Touch usability | Tablet touch targets MUST be at least 48x48 CSS px; the slider thumb MUST be at least 64x64 CSS px; layouts MUST work in portrait and landscape.                 | TS-21, TS-22        |
| NFR-008 | Accessibility   | Text MUST meet WCAG 2.2 AA contrast. Tablet and admin interfaces MUST respect `prefers-reduced-motion` and be keyboard operable.                                 | TS-21               |
| NFR-009 | Offline assets  | All fonts, images, audio and animation assets MUST be served by the app itself. No runtime dependency on external CDNs or streaming.                             | TS-23               |
| NFR-010 | Compatibility   | Supported browsers: current Chrome, Edge and Safari. Final tablet and display hardware is pending confirmation.                                                  | TS-22               |
| NFR-011 | Reliability     | The server MUST run for at least 8 hours without restart or unbounded memory growth during rehearsal.                                                            | TS-22               |
| NFR-012 | Observability   | Every state transition, rejected request and admin action MUST be logged as a structured entry with timestamp, actor role and outcome.                           | TS-17               |
| NFR-013 | Maintainability | All code MUST be TypeScript in strict mode; event names, payload types and validation schemas MUST be defined once in the shared package.                        | Lint and typecheck  |

## 3. Acceptance criteria for critical requirements

### AC-FR-020 / FR-021: Three-guest rule and exactly-once countdown

- **Given** the state is `COLLECTING_ACTIVATIONS` and no guest has activated,
  **When** `chief` and `dean` activate,
  **Then** the state remains `COLLECTING_ACTIVATIONS` and no `event:countdown-started` is emitted.
- **Given** `chief` and `dean` have activated,
  **When** `vice-chancellor` activates,
  **Then** the state becomes `COUNTDOWN`, exactly one `event:countdown-started` is emitted, and it contains `startsAt`, `durationMs = 5000` and `opensAt`.
- **Given** all three activation requests arrive within 10 ms,
  **When** they are processed,
  **Then** exactly three activations are recorded, exactly one `COUNTDOWN` transition occurs, and exactly one server timer is scheduled.

### AC-FR-012: Identity from session only

- **Given** a socket authenticated as `dean`,
  **When** it sends `guest:activate` with a payload containing `{ "role": "chief" }`,
  **Then** the payload is rejected with `VALIDATION_ERROR` (unknown field) and the `chief` activation is not recorded.
- **Given** an unauthenticated socket or a `display` socket,
  **When** it sends `guest:activate`,
  **Then** it receives `UNAUTHORIZED` or `FORBIDDEN` respectively and the state is unchanged.

### AC-FR-014: Duplicate activation

- **Given** `chief` has an accepted activation,
  **When** `chief` sends `guest:activate` again (for example, from a second tab),
  **Then** the acknowledgement is `ALREADY_ACTIVATED` with the original `activatedAt`, `version` is unchanged, and no `guest:activated` event is broadcast.

### AC-FR-015 / FR-031: Disconnection and recovery

- **Given** `chief` has an accepted activation,
  **When** the `chief` tablet loses network and reconnects,
  **Then** the server still reports `chief` as activated and the tablet shows the activated state.
- **Given** the state is `COUNTDOWN` with 3 s remaining,
  **When** the display page is refreshed,
  **Then** after reconnecting it shows the countdown at the correct remaining time (within NFR-002 tolerance), not restarted from 5.

### AC-FR-025 / FR-027: Server-owned opening and abort

- **Given** the state is `COUNTDOWN`,
  **When** `opensAt` is reached on the server clock,
  **Then** the state becomes `OPENED` and `event:opened` is broadcast once.
- **Given** the state is `COUNTDOWN`,
  **When** an admin aborts,
  **Then** the state becomes `ABORTED`, no `event:opened` is ever emitted for that run, and all clients stop countdown visuals and audio.

### AC-FR-045: Emergency manual start

- **Given** an admin session and state `COLLECTING_ACTIVATIONS`,
  **When** the admin submits manual start with the exact confirmation phrase and the correct admin password,
  **Then** the state becomes `COUNTDOWN` with `trigger = "MANUAL"` and an audit entry is recorded.
- **When** the phrase or password is wrong, or the requester is not admin,
  **Then** the request is rejected (`VALIDATION_ERROR`, `UNAUTHORIZED` or `FORBIDDEN`) and the state is unchanged.

### AC-FR-062: Audio failure tolerance

- **Given** the countdown audio file is missing or audio is not unlocked,
  **When** the countdown runs,
  **Then** the visual countdown, opening animation and opening screen complete on schedule, and the failure is logged.
