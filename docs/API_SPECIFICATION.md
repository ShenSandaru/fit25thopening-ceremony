# API Specification

> Status: **PROPOSED contracts.** Nothing here is implemented yet. These contracts are the target for Phases 2 to 7. When implemented, the types and zod schemas in `packages/shared` become the source of truth, and this document must be kept in sync with them.

## 1. Overview

- REST base path: `/api`, served by `apps/server`.
- Socket.IO: default path `/socket.io`, single default namespace, served by `apps/server`.
- The web app reads the server origin from `NEXT_PUBLIC_SERVER_URL`.
- All timestamps are **epoch milliseconds (number) from the server clock** unless stated otherwise.
- Role IDs: `chief`, `vice-chancellor`, `dean`, `display`, `admin`. `GuestRole` is `chief | vice-chancellor | dean`.

## 2. Conventions

### Response envelope (REST and socket acknowledgements)

```ts
type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: { code: ErrorCode; message: string; details?: unknown } };
type Result<T> = Ok<T> | Err;
```

`message` is human-readable and safe to show to operators; it never contains secrets or stack traces.

### Error codes

| Code                 | HTTP | Meaning                                                                                            |
| -------------------- | ---- | -------------------------------------------------------------------------------------------------- |
| `VALIDATION_ERROR`   | 400  | Body or payload failed schema validation, has unknown fields, or the confirmation phrase is wrong. |
| `UNAUTHORIZED`       | 401  | No valid session, invalid credential, or wrong re-entered password.                                |
| `FORBIDDEN`          | 403  | Valid session, but the role may not perform this action.                                           |
| `INVALID_TRANSITION` | 409  | The action is not allowed in the current state. `details` contains `{ status }`.                   |
| `ALREADY_ACTIVATED`  | 409  | This guest role has already been activated in this run. `details` contains `{ activatedAt }`.      |
| `RATE_LIMITED`       | 429  | Too many requests. `details` may contain `{ retryAfterMs }`.                                       |
| `INTERNAL_ERROR`     | 500  | Unexpected server failure. Details are logged server-side only.                                    |

### Validation

- Every REST body and socket payload is parsed with a **strict** zod schema from `packages/shared`. Unknown fields are rejected with `VALIDATION_ERROR`.
- Identity is never read from a body or payload. The role comes from the verified session.

### Authentication

- Login endpoints set an httpOnly session cookie (see [SECURITY.md](SECURITY.md#4-sessions-and-tokens)).
- REST requests are sent with credentials. Socket.IO connects with `withCredentials: true`; the handshake middleware verifies the same cookie.

## 3. Shared data types

```ts
type CeremonyStatus =
  "WAITING" | "READY" | "COLLECTING_ACTIVATIONS" | "COUNTDOWN" | "OPENED" | "ABORTED";

type GuestRole = "chief" | "vice-chancellor" | "dean";
type Role = GuestRole | "display" | "admin";

type GuestActivation = { activatedAt: number } | null;

type CountdownInfo = {
  trigger: "ALL_ACTIVATED" | "MANUAL";
  acceptedAt: number; // server time the countdown was decided
  startsAt: number; // acceptedAt + preparationDelayMs
  durationMs: number; // default 5000
  opensAt: number; // startsAt + durationMs
};

type CeremonyState = {
  runId: string; // changes on every reset
  version: number; // increments on every state change
  status: CeremonyStatus;
  activations: Record<GuestRole, GuestActivation>;
  countdown: CountdownInfo | null;
  openedAt: number | null;
  abortedAt: number | null;
  updatedAt: number;
  serverTime: number; // server clock when this snapshot was sent
};

type DeviceStatus = {
  role: Role;
  connected: boolean;
  connectionCount: number; // sockets currently connected for this role
  lastSeenAt: number | null;
};

type ActivityEntry = {
  id: string;
  at: number;
  type: string; // e.g. "STATE_CHANGED", "ACTIVATION_ACCEPTED", "ACTIVATION_REJECTED", "DEVICE_CONNECTED", "ADMIN_ACTION"
  actorRole: Role | "server" | null;
  message: string;
  data?: Record<string, unknown>; // never contains secrets
};
```

## 4. REST endpoints

### Permission summary

| Endpoint                       | Auth                        | Allowed roles     | Allowed states                                         |
| ------------------------------ | --------------------------- | ----------------- | ------------------------------------------------------ |
| `GET /api/health`              | None                        | Any               | Any                                                    |
| `POST /api/auth/guest`         | Credential in body          | n/a               | Any                                                    |
| `POST /api/auth/display`       | Credential in body          | n/a               | Any                                                    |
| `POST /api/auth/admin`         | Credential in body          | n/a               | Any                                                    |
| `GET /api/auth/session`        | Session                     | Any authenticated | Any                                                    |
| `GET /api/event/state`         | Session                     | Any authenticated | Any                                                    |
| `GET /api/event/activity`      | Session                     | `admin`           | Any                                                    |
| `POST /api/event/prepare`      | Session                     | `admin`           | `WAITING`                                              |
| `POST /api/event/start`        | Session                     | `admin`           | `READY`                                                |
| `POST /api/event/abort`        | Session                     | `admin`           | `READY`, `COLLECTING_ACTIVATIONS`, `COUNTDOWN`         |
| `POST /api/event/reset`        | Session                     | `admin`           | `READY`, `COLLECTING_ACTIVATIONS`, `OPENED`, `ABORTED` |
| `POST /api/event/manual-start` | Session + password re-entry | `admin`           | `COLLECTING_ACTIVATIONS`                               |

`/api/auth/display`, `/api/auth/session`, `/api/event/activity` and `/api/health` are additions to the initially listed endpoints. They are needed for display authentication, client session checks, the admin activity view and network diagnostics respectively.

### `GET /api/health`

Unauthenticated reachability check for operators and devices.

- Response `200`: `{ ok: true, data: { serverTime: number } }`
- Must not expose state, versions, configuration or secrets.

### `POST /api/auth/guest`

Exchanges a guest access code for a guest session.

- Body: `{ role: GuestRole; accessCode: string }` (`accessCode` length 6 to 128)
- The `role` field only selects which credential to check; the access code is the proof of identity. A code valid for one role never authenticates another.
- `200`: sets session cookie; `{ ok: true, data: { role: GuestRole; expiresAt: number } }`
- Errors: `VALIDATION_ERROR`, `UNAUTHORIZED` (generic message, no hint whether role or code was wrong), `RATE_LIMITED`.

### `POST /api/auth/display`

- Body: `{ accessCode: string }`
- `200`: sets session cookie; `{ ok: true, data: { role: "display"; expiresAt: number } }`
- Errors: `VALIDATION_ERROR`, `UNAUTHORIZED`, `RATE_LIMITED`.

### `POST /api/auth/admin`

- Body: `{ password: string }`
- `200`: sets session cookie; `{ ok: true, data: { role: "admin"; expiresAt: number } }`
- Errors: `VALIDATION_ERROR`, `UNAUTHORIZED`, `RATE_LIMITED`.

### `GET /api/auth/session`

Lets a page check whether it already has a session, and for which role.

- `200`: `{ ok: true, data: { role: Role; expiresAt: number } }`
- Errors: `UNAUTHORIZED`.

A client page MUST verify that the session role matches the route (for example, `/guest/dean` requires `dean`) and otherwise show the login form. This is a UX check only; the server enforces permissions independently.

### `GET /api/event/state`

- `200`: `{ ok: true, data: CeremonyState }`
- Errors: `UNAUTHORIZED`.

### `GET /api/event/activity`

- Query: `limit` (optional, 1 to 200, default 100)
- `200`: `{ ok: true, data: { entries: ActivityEntry[] } }` newest first.
- Errors: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`.

### `POST /api/event/prepare`

- Body: `{}`
- Transition: `WAITING` to `READY`.
- `200`: `{ ok: true, data: CeremonyState }`
- Errors: `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_TRANSITION`.
- Broadcasts: `event:state`.

### `POST /api/event/start`

- Body: `{}`
- Transition: `READY` to `COLLECTING_ACTIVATIONS`.
- `200`: `{ ok: true, data: CeremonyState }`
- Errors: `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_TRANSITION`.
- Broadcasts: `event:activation-started`, `event:state`.

### `POST /api/event/abort`

- Body: `{ reason?: string }` (max 200 characters)
- Transition: `READY`, `COLLECTING_ACTIVATIONS` or `COUNTDOWN` to `ABORTED`. Cancels the pending opening timer.
- `200`: `{ ok: true, data: CeremonyState }`
- Errors: `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_TRANSITION`, `VALIDATION_ERROR`.
- Broadcasts: `event:aborted`, `event:state`.

### `POST /api/event/reset`

- Body: `{}`
- Transition: `READY`, `COLLECTING_ACTIVATIONS`, `OPENED` or `ABORTED` to `WAITING`. Clears activations and countdown, generates a new `runId`. Sessions stay valid.
- `200`: `{ ok: true, data: CeremonyState }`
- Errors: `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_TRANSITION`.
- Broadcasts: `event:reset`, `event:state`.

### `POST /api/event/manual-start`

Emergency override that starts the countdown without all three activations.

- Body: `{ confirmation: "START CEREMONY"; password: string }`
- Requires: admin session **and** correct re-entered admin password **and** exact confirmation phrase.
- Transition: `COLLECTING_ACTIVATIONS` to `COUNTDOWN` with `trigger: "MANUAL"`.
- `200`: `{ ok: true, data: CeremonyState }`
- Errors: `UNAUTHORIZED` (no session or wrong password), `FORBIDDEN`, `VALIDATION_ERROR` (wrong phrase), `INVALID_TRANSITION`, `RATE_LIMITED`.
- Broadcasts: `event:countdown-started`, `event:state`. Records an `ADMIN_ACTION` activity entry with outcome, for both success and failure.

## 5. Socket.IO contract

### Connection

- Client connects to `NEXT_PUBLIC_SERVER_URL` with `withCredentials: true` and automatic reconnection enabled.
- Handshake middleware verifies the session cookie. Missing or invalid sessions are refused with a `connect_error` whose `message` is `UNAUTHORIZED`.
- On success, the server sets `socket.data.role`, joins rooms, updates presence, and immediately emits `event:state` to that socket. Admin sockets also receive `device:status`.

### Rooms

| Room                                                                            | Members                    |
| ------------------------------------------------------------------------------- | -------------------------- |
| `ceremony`                                                                      | Every authenticated socket |
| `role:chief`, `role:vice-chancellor`, `role:dean`, `role:display`, `role:admin` | Sockets for that role      |

### Client to server events

All client-to-server events use an acknowledgement callback that receives a `Result`.

| Event            | Allowed roles                      | Payload                    | Ack data                                                    | Errors                                                                                     |
| ---------------- | ---------------------------------- | -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `guest:activate` | `chief`, `vice-chancellor`, `dean` | `{}` (strict, no fields)   | `{ role: GuestRole; activatedAt: number; version: number }` | `FORBIDDEN`, `VALIDATION_ERROR`, `INVALID_TRANSITION`, `ALREADY_ACTIVATED`, `RATE_LIMITED` |
| `clock:sync`     | Any authenticated                  | `{ clientSentAt: number }` | `{ clientSentAt: number; serverTime: number }`              | `VALIDATION_ERROR`, `RATE_LIMITED`                                                         |

`clock:sync` is an addition to the initially listed events, required for countdown synchronization (see [ARCHITECTURE.md](ARCHITECTURE.md#7-countdown-synchronization)).

Admin commands are REST only (section 4), not socket events, so that each has a clear HTTP result and passes through the same middleware.

### Server to client events

| Event                      | Recipients                                           | Payload                                                                            | When                                        |
| -------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| `event:state`              | Connecting socket; `ceremony` room after each change | `CeremonyState`                                                                    | On connect and after every state change     |
| `event:activation-started` | `ceremony`                                           | `{ runId; version; startedAt: number }`                                            | `READY` to `COLLECTING_ACTIVATIONS`         |
| `guest:activated`          | `ceremony`                                           | `{ runId; version; role: GuestRole; activatedAt: number; activatedCount: number }` | Each accepted activation                    |
| `event:countdown-started`  | `ceremony`                                           | `{ runId; version; serverTime: number } & CountdownInfo`                           | Entering `COUNTDOWN`                        |
| `event:opened`             | `ceremony`                                           | `{ runId; version; openedAt: number }`                                             | Server timer reaches `opensAt`              |
| `event:aborted`            | `ceremony`                                           | `{ runId; version; abortedAt: number; reason: string \| null }`                    | Entering `ABORTED`                          |
| `event:reset`              | `ceremony`                                           | `{ runId; version; resetAt: number }` (new `runId`)                                | Entering `WAITING` by reset                 |
| `device:status`            | `role:admin`                                         | `{ devices: DeviceStatus[] }` (all five roles)                                     | On admin connect and on any presence change |
| `activity:logged`          | `role:admin`                                         | `ActivityEntry`                                                                    | Each new activity entry                     |

`activity:logged` is an addition, used by the admin activity view.

### Client handling rules

- Render from the latest `event:state` with the highest `version`; ignore any event or snapshot with a lower `version` or a different `runId` than the current snapshot (except `event:reset`, which introduces a new `runId`).
- Domain events trigger cues (sounds, animations). If a domain event is missed, the next `event:state` must still produce the correct screen.
- On `connect_error` with `UNAUTHORIZED`, show the login form instead of retrying indefinitely.

## 6. Configuration (environment variables)

Server (`apps/server`):

| Variable                            | Default         | Purpose                                     |
| ----------------------------------- | --------------- | ------------------------------------------- |
| `HOST`                              | `0.0.0.0`       | Bind address                                |
| `PORT`                              | `4000`          | HTTP and Socket.IO port                     |
| `CORS_ORIGINS`                      | none (required) | Comma-separated allowed web origins         |
| `SESSION_SECRET`                    | none (required) | Token signing key, at least 32 random bytes |
| `GUEST_CHIEF_ACCESS_CODE`           | none (required) | Chief Guest credential                      |
| `GUEST_VICE_CHANCELLOR_ACCESS_CODE` | none (required) | Vice Chancellor credential                  |
| `GUEST_DEAN_ACCESS_CODE`            | none (required) | Dean credential                             |
| `DISPLAY_ACCESS_CODE`               | none (required) | Main display credential                     |
| `ADMIN_PASSWORD_HASH`               | none (required) | scrypt hash of the admin password           |
| `COUNTDOWN_DURATION_MS`             | `5000`          | Countdown length                            |
| `PREPARATION_DELAY_MS`              | `0`             | Optional delay before countdown starts      |
| `LOG_LEVEL`                         | `info`          | Log verbosity                               |

Web (`apps/web`):

| Variable                 | Default         | Purpose                                         |
| ------------------------ | --------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SERVER_URL` | none (required) | Origin of `apps/server`, for REST and Socket.IO |

The server MUST validate its environment at startup and refuse to start if a required variable is missing or invalid. Example files (`.env.example`) will be added with the apps in Phase 1 and Phase 2.
