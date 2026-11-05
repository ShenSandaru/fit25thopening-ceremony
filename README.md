# FIT Expo Opening Ceremony

A synchronized, web-based opening ceremony system for the **FIT Expo** of the **Faculty of Information Technology, University of Moratuwa**.

Three distinguished guests (the Chief Guest, the Vice Chancellor and the Dean of IT) each slide to activate on their own tablet. When the server has accepted all three activations, the main display runs a synchronized 5-second countdown with audio, plays the opening animation, and reveals the official FIT Expo opening screen. Organizers control and monitor the ceremony from an admin dashboard.

## Current status

**Phase 4 complete: main display and live synchronization.** `/` is the ceremony display in a browser on the ceremony laptop. The projector shows that screen by mirroring or an extended desktop. An organizer assigns each tablet at `/guest` and uses **Begin activations** on the display. The server starts the countdown only after all three activations. The display follows server timestamps. Audio files under `public/audio/placeholders/` are temporary tones, not official ceremony audio. The admin dashboard is still later. A backend restart clears device sessions and ceremony state.

## Interfaces

| Interface              | Route                    |
| ---------------------- | ------------------------ |
| Main Display           | `/`                      |
| Chief Guest tablet     | `/guest/chief`           |
| Vice Chancellor tablet | `/guest/vice-chancellor` |
| Dean of IT tablet      | `/guest/dean`            |
| Admin Dashboard        | `/admin`                 |

## Planned architecture

```mermaid
flowchart LR
  Tablets["Guest tablets x3"] -->|"guest:activate"| Server
  Admin["Admin dashboard"] -->|"REST /api/event/*"| Server
  Server["apps/server: Express + Socket.IO (single source of truth)"] -->|"event:state and events"| Display["Main display"]
  Server --> Tablets
  Server --> Admin
```

- `apps/web`: one Next.js (App Router) app serving all five interfaces.
- `apps/server`: one Express + Socket.IO server that owns the ceremony state machine (`WAITING`, `READY`, `COLLECTING_ACTIVATIONS`, `COUNTDOWN`, `OPENED`, `ABORTED`).
- `packages/shared`: shared TypeScript types, Socket.IO event names and zod schemas.

The backend alone decides when the countdown starts, timestamps it (`startsAt`, `opensAt`) and opens the ceremony. Clients only render. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Technology stack

Installed now:

- TypeScript 6.0 (strict) in a pnpm 12 workspaces monorepo
- Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4
- Node.js 24, Express 5, Socket.IO 4
- zod 4 for environment validation and shared payload schemas
- Vitest 5, Supertest, socket.io-client for backend tests; Playwright for web e2e
- ESLint 9 and Prettier

Added in later phases: Motion (animations), auth credentials validation. No database; ceremony state is in-memory.

## Repository layout

```
apps/
  web/        @fit-expo/web     Next.js frontend (all five interfaces, from Phase 3)
  server/     @fit-expo/server  Express backend (single source of truth, from Phase 2)
packages/
  shared/     @fit-expo/shared  Shared constants, and from Phase 2 types, events and schemas
docs/                           Architecture, requirements, API, security, design, testing
```

## Prerequisites

- Node.js 24 or later
- pnpm 12.4 or later (the exact version is pinned in `packageManager` in `package.json`)
- Internet access for `pnpm install`, the first `pnpm build` (Next.js downloads the Outfit and Inter fonts at build time and serves them locally), and the one-time Playwright browser download

## Setup

```bash
pnpm install

# Environment files (never commit the copies)
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local
```

On Windows PowerShell use `Copy-Item` instead of `cp`.

Server required variables (see `apps/server/.env.example`): `CORS_ORIGINS`, `SESSION_SECRET` (at least 32 characters). Optional: `COUNTDOWN_DURATION_MS` (default 5000), `PREPARATION_DELAY_MS` (default 0), `LOG_LEVEL`. The server exits on startup if required variables are missing or invalid, naming the variable without printing its value.

Quick checks after `pnpm build` and configuring `.env`:

```bash
pnpm start:server
curl http://127.0.0.1:4000/api/health
curl http://127.0.0.1:4000/api/event/state   # development/test only until Phase 3 auth
```

## Development

```bash
pnpm dev            # shared (watch), server on :4000 and web on :3000
pnpm dev:server     # server only
pnpm dev:web        # web only
```

`pnpm dev` builds `@fit-expo/shared` once, then runs all three packages in parallel.

## Quality checks

```bash
pnpm typecheck      # strict TypeScript in every package
pnpm lint           # ESLint in every package
pnpm test           # Vitest unit tests in every package
pnpm format         # apply Prettier
pnpm format:check   # verify Prettier formatting
pnpm check          # format check, lint, typecheck, test and build
```

End-to-end tests run against the production build:

```bash
pnpm --filter @fit-expo/web exec playwright install chromium   # once per machine
pnpm build
pnpm test:e2e
```

## Production build

```bash
pnpm build          # shared, server (tsc to apps/server/dist) and web (next build)
pnpm start:server   # node apps/server/dist/server.js
pnpm start:web      # next start
```

Deployment on the venue network is planned for Phase 9.

## Documentation

| Document                                               | Contents                                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                 | Rules for AI agents and contributors: read first                       |
| [PLAN.md](PLAN.md)                                     | Phased roadmap and task status                                         |
| [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)   | Purpose, roles, workflow, scope                                        |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)           | Architecture, state machine, synchronization, recovery, open decisions |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)           | Functional and non-functional requirements                             |
| [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md) | Proposed REST and Socket.IO contracts and configuration                |
| [docs/SECURITY.md](docs/SECURITY.md)                   | Authentication, authorization, secrets, rate limiting                  |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)         | Faculty branding, typography, UI, animation and audio principles       |
| [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md)   | Test levels, scenarios, rehearsal checklist                            |

## Pending decisions

The venue network, device hardware, credential delivery, state persistence, official logo files and audio assets are not yet decided. See [PLAN.md](PLAN.md#open-decisions).

## Security note

Never commit `.env` files or credentials. Only `.env.example` files with placeholder values belong in the repository.
