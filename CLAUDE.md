# CLAUDE.md

Guidance for AI agents and developers working in this repo. Read these first:

1. `docs/specs/product.md`: requirements, business rules R1 to R8, worked examples
2. `docs/rules/project-rules.md`: rules for every repo (security, money, testing, logging, AI work). This file covers the stack only and does not repeat those rules.
3. `docs/specs/features/F1-F6`: one approved spec per feature, with acceptance criteria IDs (for example `F3.AC4`)
4. `docs/plans/`: one plan per feature, written after its spec and before its code

All app code lives in `app/`.

## Requirements

- Node.js 22 LTS or later
- npm

## Stack

| Choice | Why |
|---|---|
| Next.js (App Router) + TypeScript | One codebase for pages and API routes, with types shared between them. |
| SQLite + Drizzle ORM (driver: `better-sqlite3`) | A single-file database needs no server. Drizzle gives typed, parameterised queries. `better-sqlite3` has synchronous transactions. |
| argon2id (package `@node-rs/argon2`) | A standard, memory-hard password hash. bcrypt counts bytes, not characters, so a 72-character password with multi-byte characters would be silently truncated. argon2id has no such limit, so F1.R2's 72-character rule holds. |
| iron-session | Signed, encrypted cookie sessions with no session table. Supports a cookie with no expiry (F1.R8). |
| Vitest | Fast, TypeScript-native unit tests. No database or browser needed. |
| npm | The default package manager for Node. |
| pino (logger) | Structured logs with redaction of secret fields. Used only through `src/lib/logger.ts`. |

## Folder layout (inside `app/`)

```
app/
├── package.json, tsconfig.json, drizzle.config.ts, vitest.config.ts, .env.example
├── drizzle/                  generated SQL migrations (human approval needed)
├── src/
│   ├── app/                  Next.js routes and pages. Thin: parse the request, call a service, return the response.
│   ├── domain/               PURE functions. No imports from db/, next/, iron-session or @node-rs/argon2.
│   │   ├── validation.ts       emails, passwords, names, amounts (R1, F1.R2, ...)
│   │   ├── split.ts            equal split and leftover cents (R3)
│   │   ├── balances.ts         balances (R4, R5)
│   │   ├── settle-up.ts        suggested payments (R6)
│   │   └── money.ts            cents <-> display string
│   ├── services/             Use cases: register, login, addExpense, ... They receive their
│   │                         dependencies (stores, hasher, clock, logger) as arguments.
│   ├── ports/                TypeScript interfaces: UserStore, TripStore, PersonStore, ...
│   ├── db/                   Drizzle schema, client, and the store implementations of the ports.
│   │                         The only place that touches SQL. Ownership checks live here.
│   ├── auth/                 iron-session config, cookie options, access check helper
│   └── lib/                  logger, env/config loader
└── tests/
    ├── domain/, services/    Unit tests. Mirror src/.
    └── fakes/                In-memory fakes for the ports.
```

Rules for this layout:

- `domain/` and `services/` must not import `db/`, `next/*`, iron-session or @node-rs/argon2. A hasher or store reaches them through a port, so a test can pass a fake.
- Unit tests never touch SQLite, the network, the clock or a running app. Pass the time in as an argument.
- UI decisions that acceptance criteria check (for example, hiding Add expense when a trip has no people, F4.AC20) live in plain view-model functions in `domain/`. Unit tests cover them without rendering the page.
- Ownership checks, database constraints and cascading deletes are checked in code review, not by unit tests (project-rules › Testing).

## Commands

Run these from `app/`. The scaffold, built in the F1 work, defines these npm scripts.

| Task | Command |
|---|---|
| Install | `cd app && npm install` |
| Set up env | `cp .env.example .env`, then set `SESSION_SECRET` (32+ characters) and `DATABASE_URL` (path to the SQLite file) |
| Run the app | `npm run dev` (http://localhost:3000) |
| Production build | `npm run build && npm start` |
| Run unit tests | `npm test` (runs `vitest run` once) |
| Watch tests | `npm run test:watch` |
| Create a migration | `npm run db:generate` |
| Apply migrations | `npm run db:migrate` |

## Money

- Amounts are whole cents stored as integers: `amount_cents` in the database, cents in the domain code, cents in the API.
- Never use floats for money. No `parseFloat`, `Number()` or float arithmetic on amounts.
- Convert user input to cents once, at the boundary, in `domain/money.ts`. Format cents for display once, there too.
- Source: product.md › Assumptions ("Amounts are stored as whole cents, never as floating-point numbers") and project-rules.md › Data and money.

## Conventions

- Times are stored in UTC and converted to local time for display only.
- Database queries use parameters only. Never build SQL by joining user input into a string.
- A write that changes more than one record runs inside one `db.transaction`.
- Log with the project logger only. Never use `console` or `print`. Never log passwords, tokens, keys or personal data.
- Every test name carries its acceptance criterion ID, such as `F3.AC4`.
- Never delete, skip or loosen a test to make a run pass. Stop and ask instead.
- A person must approve changes to authentication, secrets and env files, database migrations, CI and deploy config, and any deletion or disabling of tests.
- Secrets come from environment variables only. `.env` is git-ignored.

## Commit rule

Every commit includes docs/activities-outputs/session-logs/ and docs/activities-outputs/usage.md.
