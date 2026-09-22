# قوت — Qoot Nutrition Coach

Arabic-first nutrition and fitness coaching for Egyptian and Arab users.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/qoot/src/App.tsx` — main RTL mobile-first product shell and feature routes
- `artifacts/qoot/src/index.css` — Qoot theme tokens, typography, and motion
- `artifacts/api-server/src/routes/qoot.ts` — profile, plan, meal, progress, food, coach, and scanner endpoints
- `lib/api-spec/openapi.yaml` — API source of truth
- `lib/db/src/schema/qoot.ts` — persistent PostgreSQL schema

## Architecture decisions

- The app uses a single local profile and persistent PostgreSQL tables for the first-user experience; account/auth scope is intentionally outside this build.
- All client/server contracts are generated from the OpenAPI spec so the RTL UI and API share the same payload shapes.
- Coach replies and meal scanning are deterministic local product flows for the first build; they are structured behind REST endpoints so a model or image service can replace them later.

## Product

Qoot includes an Arabic RTL dashboard, Egyptian food search and meal logging, yesterday repeat, water tracking, coach conversation, simulated meal photo analysis with editable macros, weight/workout progress, unit-aware profile editing, live Mifflin-St Jeor targets, and versioned plan history.

## User preferences

The primary experience should remain Arabic RTL with natural Egyptian phrasing and a premium dark, emerald/teal/amber visual identity.

## Gotchas

- The Vite build requires workflow-provided `PORT` and `BASE_PATH`; use the managed web workflow for normal runs.
- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before using new hooks or Zod schemas.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
