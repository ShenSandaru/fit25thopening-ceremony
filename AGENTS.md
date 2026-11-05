# AGENTS.md

Instructions for AI coding agents (and humans) working on the **FIT Expo Opening Ceremony** system of the Faculty of Information Technology, University of Moratuwa.

This file is the entry point. It summarizes the rules; the documents in `docs/` contain the detail and are authoritative for their topic.

## 0. Mandatory workflow for every agent

You MUST:

1. **Read this `AGENTS.md` before making any change.**
2. **Read the relevant documentation before implementing a feature**: at minimum [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the documents for the area you touch ([API_SPECIFICATION](docs/API_SPECIFICATION.md), [SECURITY](docs/SECURITY.md), [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md), [REQUIREMENTS](docs/REQUIREMENTS.md), [TESTING_STRATEGY](docs/TESTING_STRATEGY.md)). Check [PLAN.md](PLAN.md) for the current phase and task.
3. **Inspect existing code before modifying it.** Search for existing components, hooks, services, types and constants before creating new ones.
4. **Avoid unnecessary dependencies.** Prefer the platform, the existing stack and Node built-ins. Justify every new dependency in the change description.
5. **Avoid duplicating components or business logic.** Reuse or extend; do not copy.
6. **Keep frontend and backend responsibilities separate** (section 4).
7. **Never bypass backend validation**, not even "temporarily" or for testing in production code.
8. **Never introduce unrequested functionality.** Implement the task in scope; propose extras instead of building them.
9. **Run relevant tests, linting, typechecking and builds after changes**, and report the results honestly. Do not mark a task done if checks fail or were not run.
10. **Update documentation when architecture or requirements change**, in the same change. Update task status in [PLAN.md](PLAN.md) only when work is implemented and verified.

If a requirement is ambiguous or conflicts with these documents, stop and ask rather than guessing.

## 1. Project overview

A synchronized, web-based opening ceremony. Three guests (Chief Guest, Vice Chancellor, Dean of IT) each slide to activate on their own tablet. Only after the **server** has accepted all three activations does it start a 5-second countdown; the main display then plays the opening animation and shows the official FIT Expo opening screen. An admin dashboard lets organizers control and monitor the ceremony.

| Interface              | Route                    | Role              |
| ---------------------- | ------------------------ | ----------------- |
| Main Display           | `/`                      | `display`         |
| Chief Guest tablet     | `/guest/chief`           | `chief`           |
| Vice Chancellor tablet | `/guest/vice-chancellor` | `vice-chancellor` |
| Dean of IT tablet      | `/guest/dean`            | `dean`            |
| Admin Dashboard        | `/admin`                 | `admin`           |

Business rule: the countdown starts only when `chief`, `vice-chancellor` and `dean` all have server-accepted activations, or after an authorized emergency manual start.

This is **purely web-based**. The ceremony display is the `/` page in a browser on the ceremony laptop. A projector shows that laptop screen through HDMI mirroring or an extended desktop. There is no projector application, projector API, screen-sharing feature, door control, IoT, or other hardware integration. See [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md).

## 2. Technology stack

| Area            | Technology                                                             |
| --------------- | ---------------------------------------------------------------------- |
| Language        | TypeScript everywhere (`strict: true`)                                 |
| Package manager | pnpm workspaces                                                        |
| Frontend        | Next.js (App Router), React, Tailwind CSS v4, Motion, Socket.IO client |
| Backend         | Node.js, Express, Socket.IO                                            |
| Shared          | `packages/shared`: types, constants, event names, zod schemas          |
| Validation      | zod (shared between web and server)                                    |
| Testing         | Vitest, Supertest, socket.io-client, Playwright                        |
| Lint and format | ESLint (flat config), typescript-eslint, eslint-config-next, Prettier  |
| Database        | None. PostgreSQL only if a documented decision requires persistence    |

Do not swap any of these without updating this file and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) with the justification.

### Installed versions and pins

| Tool                                | Version                | Why pinned                                                                                              |
| ----------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| Node.js                             | 24.x (`>=24`)          | `engines` in root `package.json`                                                                        |
| pnpm                                | 12.4.2                 | `packageManager` in root `package.json`                                                                 |
| TypeScript                          | `~6.0.3`               | typescript-eslint supports `<6.1`; do not upgrade to TypeScript 7 until it does                         |
| ESLint                              | `^9.39`                | eslint-config-next plugins (react, jsx-a11y, import) do not yet support ESLint 10; upgrade when they do |
| Next.js / React                     | 16.4 / 19.3            |                                                                                                         |
| Tailwind CSS                        | 4.3                    |                                                                                                         |
| Express / zod / Vitest / Playwright | 5.3 / 4.6 / 5.1 / 1.64 |                                                                                                         |

Packages not yet installed because their phase has not started: `motion` (Phase 6). `socket.io` is on the server; `socket.io-client` and `supertest` are server test dependencies (web client Socket.IO arrives in Phase 3/4). Add each new dependency only in the phase that uses it.

Dependency build scripts are blocked by pnpm by default. Approved exceptions live under `allowBuilds` in `pnpm-workspace.yaml` (currently only `esbuild`, needed by `tsx`). Approve a new one only when it is required and explain why.

### Commands

Run from the repository root:

| Command                             | Purpose                                                              |
| ----------------------------------- | -------------------------------------------------------------------- |
| `pnpm install`                      | Install all workspace dependencies                                   |
| `pnpm dev`                          | Build shared, then run shared (watch), server and web in parallel    |
| `pnpm dev:web` / `pnpm dev:server`  | Run one app (builds shared first)                                    |
| `pnpm build`                        | Build all packages in dependency order                               |
| `pnpm typecheck`                    | Build shared, then typecheck every package                           |
| `pnpm lint`                         | ESLint in every package                                              |
| `pnpm test`                         | Build shared, then run Vitest in every package                       |
| `pnpm test:e2e`                     | Playwright against the web production build (run `pnpm build` first) |
| `pnpm format` / `pnpm format:check` | Prettier write / check                                               |
| `pnpm check`                        | Format check, lint, typecheck, test and build in one go              |

## 3. Architecture summary

- One Next.js app (`apps/web`), one Express + Socket.IO server (`apps/server`), one shared package (`packages/shared`).
- **The backend is the single source of truth.** `CeremonyService` in `apps/server/src/state/` owns ceremony state; nothing else mutates it.
- State machine: `WAITING`, `READY`, `COLLECTING_ACTIVATIONS`, `COUNTDOWN`, `OPENED`, `ABORTED`. Allowed transitions are defined once (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#5-event-state-management)); everything else is rejected with `INVALID_TRANSITION`.
- Countdown timing comes from server timestamps (`startsAt`, `opensAt`, epoch ms). Clients estimate clock offset via `clock:sync`.
- Only the server's timer moves `COUNTDOWN` to `OPENED`.
- One server instance. In-memory state. No horizontal scaling.
- Venue network is **PENDING**. All addresses come from environment variables.

## 4. Responsibilities

| Concern                        | Backend                                | Frontend                            |
| ------------------------------ | -------------------------------------- | ----------------------------------- |
| Ceremony state and transitions | Owns                                   | Renders only                        |
| Identity and permissions       | Verifies session, derives role         | Shows login, never asserts identity |
| Activation acceptance          | Validates, records, rejects duplicates | Sends intent, waits for ack         |
| Countdown start and `OPENED`   | Decides, timestamps, schedules         | Renders from server timestamps      |
| Presence and activity log      | Tracks                                 | Admin displays                      |
| Audio and animation            | None                                   | Plays in response to server events  |

## 5. Folder structure

```
apps/
  web/                    # @fit-expo/web
    app/                  # routes: display/, guest/{chief,vice-chancellor,dean}/, admin/
    components/
      guest/ display/ admin/ shared/
    hooks/                # React hooks (socket, server clock, audio)
    lib/                  # socket client, API client, env parsing (env.ts), utilities
    e2e/                  # Playwright specs (*.spec.ts)
    public/
      audio/ images/ animations/
  server/                 # @fit-expo/server
    src/
      config/             # env parsing and validation
      middleware/         # auth, rate limit, error handler
      socket/             # handshake auth, event handlers, rooms
      services/           # auth, presence, activity log
      controllers/        # REST controllers
      state/              # CeremonyService, transition table
      server.ts
packages/
  shared/                 # @fit-expo/shared
    src/
      constants/ events/ types/ schemas/
docs/
```

Rules:

- Create folders only when adding real files. No empty placeholders or stub files.
- Brand tokens and font variables live only in `apps/web/app/brand-tokens.css`.
- `@fit-expo/shared` is compiled to `packages/shared/dist` (ESM JavaScript plus `.d.ts`). Apps import the compiled output through the package `exports`, so shared must be built before consumers are typechecked, tested or run; the root scripts do this. Never import from `packages/shared/src` directly.
- Dependency direction: `apps/web` and `apps/server` may depend on `@fit-expo/shared`; shared depends on neither app, and the two apps never import each other.
- Environment variables are parsed in exactly one module per app: `apps/server/src/config/env.ts` and `apps/web/lib/env.ts`. Do not read `process.env` elsewhere.
- Route files in `app/` stay thin: compose components and hooks, no business logic.
- Components are grouped by interface (`guest`, `display`, `admin`); anything used by two or more interfaces goes in `components/shared`.

## 6. Coding conventions

- TypeScript strict mode; no `any` (use `unknown` and narrow). No `@ts-ignore` without a comment explaining the constraint.
- ES modules everywhere (`"type": "module"` in every package). In `apps/server` and `packages/shared` (`NodeNext` resolution) relative imports must use the `.js` extension; `apps/web` uses bundler resolution and omits extensions.
- Use `import type` for type-only imports (enforced by lint).
- Small, single-purpose modules and components. If a component exceeds roughly 200 lines or mixes concerns, split it.
- Pure functions for logic (state transitions, time maths) so they can be unit tested without I/O.
- No business logic in UI components; put client logic in hooks or `lib/`, server logic in services.
- Prefer composition over inheritance; avoid premature abstraction (no generic "framework" layers).
- Use `async`/`await`; never leave a promise unhandled.
- Format with Prettier (`pnpm format`; config in `.prettierrc.json`, LF line endings, enforced for git by `.gitattributes`) and lint with `pnpm lint`. Do not reformat unrelated code. On Windows, editors and tools may write CRLF; run `pnpm format` before `pnpm format:check`.
- Comments explain constraints the code cannot express, not what the next line does.

## 7. Naming conventions

| Item                             | Convention                                                       | Example                                                |
| -------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| Files (TS modules)               | kebab-case                                                       | `ceremony-service.ts`, `use-server-clock.ts`           |
| React component files            | PascalCase                                                       | `SlideToActivate.tsx`                                  |
| React components, classes, types | PascalCase                                                       | `CeremonyState`, `GuestStatusCard`                     |
| Functions, variables             | camelCase                                                        | `computeRemainingMs`                                   |
| Hooks                            | `use` prefix                                                     | `useCeremonySocket`                                    |
| Constants                        | UPPER_SNAKE_CASE                                                 | `DEFAULT_COUNTDOWN_DURATION_MS`                        |
| Ceremony states, error codes     | UPPER_SNAKE_CASE string literals                                 | `COLLECTING_ACTIVATIONS`, `ALREADY_ACTIVATED`          |
| Role IDs                         | kebab-case string literals                                       | `chief`, `vice-chancellor`, `dean`, `display`, `admin` |
| Socket events                    | `domain:action`, kebab-case action                               | `guest:activate`, `event:countdown-started`            |
| REST paths                       | lowercase kebab-case                                             | `/api/event/manual-start`                              |
| Environment variables            | UPPER_SNAKE_CASE; browser-exposed ones start with `NEXT_PUBLIC_` | `SESSION_SECRET`, `NEXT_PUBLIC_SERVER_URL`             |
| Tests                            | `*.test.ts` next to the code; E2E in `apps/web/e2e/*.spec.ts`    | `ceremony-service.test.ts`                             |

## 8. Component organization (frontend)

- `components/display/`: display screens per state (waiting, activation progress, countdown, opening).
- `components/guest/`: slide-to-activate control, guest status.
- `components/admin/`: control panel, guest status cards, device table, activity log, confirmation dialogs.
- `components/shared/`: brand primitives (logo frame, buttons, typography), connection indicator.
- One shared socket connection per page via a hook; components receive state through props or context, not by opening their own sockets.
- Each screen renders from the latest `CeremonyState` snapshot. Domain events only trigger cues (audio, animation).

## 9. API design conventions

- REST under `/api`, JSON only, response envelope `{ ok: true, data }` or `{ ok: false, error: { code, message, details? } }`.
- Error codes are the fixed set in [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md#2-conventions): `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_TRANSITION`, `ALREADY_ACTIVATED`, `RATE_LIMITED`, `INTERNAL_ERROR`. Add new codes only by updating that document and the shared constants.
- Every body, query and payload is validated with a strict zod schema from `packages/shared`.
- Controllers are thin: parse, authorize, call a service, map the result to the envelope.
- Admin commands are REST endpoints; do not duplicate them as socket events.
- Contracts in the API specification are the target. If implementation needs a change, update the spec first or in the same change.

## 10. Socket.IO conventions

- Event names and payload types are defined **only** in `packages/shared/src/events/` and imported by both sides. Never write an event name as an inline string literal.
- Use typed `Server<ClientToServerEvents, ServerToClientEvents>` and `Socket<...>` generics.
- Client-to-server events always use an acknowledgement callback returning the standard `Result` envelope.
- Identity comes only from `socket.data.role`, set by handshake middleware from the verified session.
- On every connection the server emits the full `event:state` to that socket.
- Every change emits `event:state` to the `ceremony` room, plus the relevant domain event.
- Clients ignore events with an older `version` or a stale `runId`.
- Do not use Socket.IO for anything the snapshot already provides; do not invent new events without updating the API specification.

## 11. State management rules

- **Server**: only `CeremonyService` mutates ceremony state. Its decision methods (`activate`, `prepare`, `start`, `abort`, `reset`, `manualStart`) are **synchronous** with no `await` between validation and mutation. This is what guarantees exactly-once countdown.
- The transition table is data, defined once, and covered by exhaustive unit tests.
- Every change increments `version`; reset generates a new `runId`.
- The opening timer is stored, cleared on abort or reset, and re-checks state and `runId` when it fires.
- **Client**: holds the latest snapshot and derived UI state only. No client-side ceremony state machine, no optimistic "activated" state, no client timer that decides anything.
- Local UI state (slider position, dialog open) stays in components; shared client state is the server snapshot provided through one hook or context.

## 12. Authentication and security

Full detail: [docs/SECURITY.md](docs/SECURITY.md). Non-negotiable rules:

- Each role has its own credential from environment variables. The admin password is stored only as a scrypt hash.
- Sessions are signed tokens in `HttpOnly` cookies. Never in `localStorage`, never in URLs.
- **Never trust a client-provided guest ID or role.** Role comes from the verified session only.
- Every REST endpoint (except health and login) and every socket connection requires a valid session; every action checks role permission.
- CORS and Socket.IO origins are an explicit allowlist (`CORS_ORIGINS`). No wildcards.
- Manual start requires admin session, confirmation phrase and password re-entry, and is always audited.
- Rate limit auth, admin and socket events.
- Never commit `.env` files or secrets. Never log credentials, tokens or cookies.

## 13. Error handling

- Do not silently swallow errors. Every `catch` either handles the error meaningfully, rethrows, or logs it with context.
- Server: typed domain errors map to the fixed error codes; a single Express error middleware produces the envelope; unexpected errors become `INTERNAL_ERROR` without stack traces in the response.
- Socket handlers always call the ack with a `Result`, including on failure.
- Client: show operator-friendly messages on admin; calm, non-technical states on display and tablets; never show stack traces to guests or the audience.
- Audio and animation failures are logged and never block the ceremony sequence.
- No arbitrary `setTimeout` delays to "wait for sync". Synchronization is based on server timestamps and acknowledgements.

## 14. Testing expectations

Full detail: [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md).

- Every change to server state logic needs unit tests; every new endpoint or event needs integration tests.
- Use fake timers for countdown and opening logic; never real sleeps.
- Exactly-once, duplicate, unauthorized and reconnection scenarios (`TS-04`, `TS-05`, `TS-06`, `TS-13`, `TS-14`) must stay green.
- Before reporting work as done: run typecheck, lint, tests and build for the affected packages and report the results. If a command does not exist yet, say so.

## 15. Accessibility and responsive design

- WCAG 2.2 AA contrast for all text. Gold text on white is not allowed (2.4:1).
- Tablets: touch targets at least 48x48 px; slider thumb at least 64x64 px; portrait and landscape; accessible alternative to the slide gesture.
- Admin: fully keyboard operable with visible focus.
- Respect `prefers-reduced-motion` on tablets and admin.
- Display: readable from distance (body at least 48 px at 1080p; countdown at least 40% of viewport height).
- Use semantic HTML and ARIA only where native semantics are insufficient.

## 16. Branding requirements

Full detail: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).

- Colours: navy blue `#1b3a6b` (primary) and gold `#c9a227` (secondary), with the supporting greys and blues listed there. These were extracted from the faculty website CSS and are not yet confirmed against a formal brand guide.
- Use the Tailwind theme tokens defined in `apps/web/app/brand-tokens.css` (for example `text-navy-blue`, `bg-gold`, `font-heading`); never hardcode HEX values in components. Never introduce a new "brand" colour without a documented source.
- Fonts: Outfit (headings) and Inter (body), self-hosted through `next/font`.
- Logos: only approved official files from `apps/web/public/images/brand/`. Do not hotlink, recreate, recolour or invent logos. Until files are supplied, use a plain text label and never call a placeholder official.
- All five interfaces share one design system.

## 17. Prohibited practices

Do NOT:

- Let the frontend decide or trigger ceremony transitions, including the countdown or opening.
- Use client timers as the source of truth, or arbitrary timeouts for synchronization.
- Trust identity, role or guest ID from request payloads or URLs.
- Bypass, weaken or skip server validation, auth or rate limiting, including for "testing".
- Mutate ceremony state outside `CeremonyService`, or add `await` inside its decision methods.
- Define socket event names, payload types or error codes outside `packages/shared`.
- Add hardware, door control, IoT or physical-device integration.
- Assume or hardcode the venue network, IP addresses or hostnames.
- Hardcode unverified brand colours, invent branding, or present placeholders as official.
- Load fonts, audio or images from external CDNs at runtime.
- Use mock data in production code paths.
- Commit `.env` files, credentials, tokens or other secrets; log secrets.
- Add a database, state library, UI kit or other dependency without a documented need.
- Create empty placeholder files or folders to match the planned structure.
- Mark a task complete in [PLAN.md](PLAN.md) without implementing and verifying it.
- Build features that are not requested or are listed as out of scope.

## 18. Documentation map

| Document                                               | Purpose                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| [README.md](README.md)                                 | Introduction and setup                                      |
| [PLAN.md](PLAN.md)                                     | Phased roadmap and task status                              |
| [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)   | Purpose, roles, scope                                       |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)           | Architecture, state machine, sync, recovery, open decisions |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)           | FR and NFR with acceptance criteria                         |
| [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md) | REST and Socket.IO contracts, env variables                 |
| [docs/SECURITY.md](docs/SECURITY.md)                   | Auth, RBAC, secrets, rate limits                            |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)         | Branding, typography, UI, animation, audio                  |
| [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md)   | Test levels, scenarios, rehearsal checklist                 |
