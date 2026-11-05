# Security

> Status: Guest access uses **device sessions** with HMAC-signed HttpOnly cookies assigned on `/guest`. The Admin Dashboard (`/admin`) is directly accessible without password authentication to provide a clean, non-overengineered operational console for trusted organizers during the live event. Guest activations remain strictly session-validated, and unauthenticated/admin sockets are forbidden from triggering activations.

## 1. Threat model (summary)

The system runs on a venue network for a single live event. Realistic risks:

- Someone on the same network opens a guest URL and tries to activate without the tablet.
- A guest tablet is left unattended or its page is copied to another device.
- A misbehaving or duplicated client sends repeated or forged requests.
- Secrets leak through the repository, client bundles, screenshots, or logs.
- The network is shared (for example, university Wi-Fi) and traffic may be observable.

Goal: no one can trigger or fake guest activations without an assigned device session, and the server strictly rejects anything that violates the ceremony state machine.

### Authentication and Access Boundaries

| Surface                                              | Access Control & Enforcement                                                                                                                          |
| :--------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                                    | Public reachability check (non-secret).                                                                                                               |
| `GET /api/event/state`                               | Session-authenticated or development/test inspection.                                                                                                 |
| `POST /api/event/prepare`, `start`, `abort`, `reset` | Direct REST admin operations for trusted event console. Transitions validated by `CeremonyService`.                                                   |
| `GET /api/event/activity`, `GET /api/devices/status` | Read-only telemetry for the organizer console.                                                                                                        |
| `POST /api/guest-sessions/assign`                    | Rate-limited tablet role assignment. Enforces 1 active tablet per role.                                                                               |
| `POST /api/guest-sessions/release-role`              | Organizer tablet release. Blocked if the guest has already activated in current run.                                                                  |
| Socket.IO connection                                 | Requires session cookie or `auth: { role: "admin" }` read-only subscription. Sockets without credentials or admin role are rejected (`UNAUTHORIZED`). |
| `guest:activate` event                               | Strictly requires authenticated guest session (`chief`, `vice-chancellor`, `dean`). Admin and display sockets are rejected (`FORBIDDEN`).             |

## 2. Roles and permissions (RBAC)

| Action                                                | chief | vice-chancellor | dean | display | admin |
| ----------------------------------------------------- | ----- | --------------- | ---- | ------- | ----- |
| Read state (`GET /api/event/state`, `event:state`)    | Yes   | Yes             | Yes  | Yes     | Yes   |
| `clock:sync`                                          | Yes   | Yes             | Yes  | Yes     | Yes   |
| `guest:activate` (own role only, implicit)            | Yes   | Yes             | Yes  | No      | No    |
| Prepare, start, abort, reset                          | No    | No              | No   | No      | Yes   |
| Manual start (with password re-entry)                 | No    | No              | No   | No      | Yes   |
| Read activity log, `device:status`, `activity:logged` | No    | No              | No   | No      | Yes   |

Rules:

- Permissions are checked on the server for every REST request and every socket event.
- Permission checks live in one place (server middleware and a shared permission map); handlers do not reimplement them.
- The admin role cannot activate on behalf of a guest. The only override is the audited manual start.

## 3. Guest, display and admin authentication

- Each guest role, the display and the admin have **separate credentials** supplied through environment variables (see [API_SPECIFICATION.md](API_SPECIFICATION.md#6-configuration-environment-variables)).
- Guest and display credentials are random access codes, at least 12 characters, generated per event (for example, with a password manager). They are never derived from names or roles.
- The admin password is stored only as a **scrypt hash** (`ADMIN_PASSWORD_HASH`, Node's built-in `crypto.scrypt`). The plaintext password is never stored on the server.
- Credential comparisons use constant-time comparison (`crypto.timingSafeEqual` on equal-length digests).
- Failed logins return a generic `UNAUTHORIZED` message that does not reveal whether the role, code or password was wrong.
- How credentials reach the tablets (typed code, QR code, or pre-provisioned link) is **PENDING**. Whatever is chosen, organizers log in the tablets before guests arrive, and the code never appears on the guest-facing screen.
- **A client-provided guest ID is never proof of identity.** The `role` field in `POST /api/auth/guest` only selects which credential to compare against.

## 4. Sessions and tokens

- On successful login, the server issues a signed token (HMAC-SHA256 with `SESSION_SECRET`) containing `role`, `issuedAt`, `expiresAt` and a token ID.
- The token is delivered as a cookie with `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` whenever the deployment uses HTTPS. It is never stored in `localStorage` or exposed to JavaScript.
- Lifetimes (proposed): guests and display 12 hours (covers setup, rehearsal and the event); admin 4 hours.
- Revocation: rotating `SESSION_SECRET` and restarting the server invalidates every session. Changing one role's access code prevents new logins for that role.
- Sessions survive an admin reset (reset changes the ceremony run, not authentication).
- Because the web app and server may run on different ports or hosts, the server enables CORS **only** for origins listed in `CORS_ORIGINS`, with `credentials: true`. Wildcard origins are prohibited.

## 5. Socket.IO authentication

- Handshake middleware verifies the session cookie before the connection is accepted. Unauthenticated connections are refused with `UNAUTHORIZED`.
- The verified role is stored in `socket.data.role`. Handlers read identity only from there.
- The Socket.IO server applies the same `CORS_ORIGINS` allowlist.
- When a token expires, the server disconnects the socket; the client shows the login form.
- Event handlers check role permission before validating or processing the payload.

## 6. Input validation

- Every REST body, query string and socket payload is validated with a strict zod schema from `packages/shared`. Unknown fields are rejected.
- String lengths are bounded (for example, abort reason max 200 characters, credentials max 128 characters).
- JSON body size is limited (for example, 10 kB) on the Express parser.
- Socket.IO `maxHttpBufferSize` is set low (for example, 10 kB).
- Validation errors return `VALIDATION_ERROR` and are logged without echoing secret fields.

## 7. Rate limiting

| Target                          | Proposed limit           | Key       |
| ------------------------------- | ------------------------ | --------- |
| `POST /api/auth/*`              | 10 requests per minute   | Client IP |
| `POST /api/event/manual-start`  | 5 requests per 5 minutes | Session   |
| Other admin `POST /api/event/*` | 30 requests per minute   | Session   |
| `guest:activate`                | 5 events per 10 seconds  | Socket    |
| `clock:sync`                    | 20 events per 10 seconds | Socket    |

Exceeding a limit returns `RATE_LIMITED`. Limits are configuration, tuned during rehearsal so that legitimate use is never blocked. Library choice (for example, `express-rate-limit` for REST, a small in-process counter for sockets) is decided in Phase 8.

## 8. Duplicate activation prevention

- The server records at most one activation per guest role per run (`runId`).
- `CeremonyService.activate` is synchronous, so two requests for the same role cannot both pass the "not yet activated" check (see [ARCHITECTURE.md](ARCHITECTURE.md#6-concurrency-and-exactly-once-guarantee)).
- A repeated activation returns `ALREADY_ACTIVATED` with the original `activatedAt`, does not change `version`, and is logged as a rejected activation.
- Multiple tabs or devices logged in as the same role are allowed to view, but only the first accepted activation counts. Admin sees the connection count per role so duplicates are visible.

## 9. Protection against unauthorized manual start

Manual start requires all of:

1. A valid admin session.
2. The exact confirmation phrase `START CEREMONY`.
3. Re-entry of the admin password, verified against `ADMIN_PASSWORD_HASH`.
4. State `COLLECTING_ACTIVATIONS`.
5. Being within the manual-start rate limit.

Every attempt, successful or not, is written to the activity log with timestamp, outcome and reason (never the password). The admin UI shows a two-step confirmation dialog and clearly distinguishes this control from normal actions. Who is authorized to use it is **PENDING** organizer confirmation.

## 10. Environment variables and secrets

- Secrets are provided only via environment variables or untracked `.env` files. `.env` and `.env.*` files are git-ignored; only `.env.example` files with placeholder values may be committed.
- Only variables prefixed `NEXT_PUBLIC_` reach the browser, and none of them may hold a secret. `NEXT_PUBLIC_SERVER_URL` is the only planned one.
- The server validates required variables at startup and exits with a clear error (naming the variable, not its value) if any are missing.
- Credentials are rotated after rehearsal and before the event day.

## 11. Logging without exposing secrets

- Logs are structured (JSON), with timestamp, level, event type, actor role and outcome.
- Never log: access codes, passwords, password hashes, session tokens, cookies, `SESSION_SECRET`, or full request bodies of auth endpoints.
- A redaction list (for example, `password`, `accessCode`, `cookie`, `authorization`, `token`) is applied by the logger.
- Error responses never contain stack traces. Full details stay in server logs.
- The admin activity log uses the same redaction rules.

## 12. Network security considerations

The venue network is **PENDING**. Implications by option:

| Option                    | Consideration                                                                                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing university Wi-Fi | Shared with other users; client isolation may block device-to-server traffic; captive portals may interfere. Prefer HTTPS if feasible; strong credentials are mandatory. Verify ports are reachable during the venue survey. |
| Dedicated local router    | Smaller attack surface. Use WPA2/WPA3 with a strong passphrase; hide from the public; disable WAN if not needed. HTTP may be acceptable on an isolated network but HTTPS is still preferred.                                 |
| Other arrangement         | Evaluate against the same criteria: isolation, reachability, stability, ability to fix IP addresses.                                                                                                                         |

General rules:

- Bind only the needed port; no admin tools or debug endpoints exposed.
- `GET /api/health` reveals no state or configuration.
- If HTTPS is used, serve both web and server over HTTPS to avoid mixed-content issues and to enable `Secure` cookies.
- The decision and its rationale are recorded in [ARCHITECTURE.md](ARCHITECTURE.md#11-open-decisions) once confirmed.
