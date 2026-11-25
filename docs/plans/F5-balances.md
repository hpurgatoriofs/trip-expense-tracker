# F5 — Balances · Plan

_Status: Approved · Last updated: 2026-11-19 · Spec: [F5-balances.md](../specs/features/F5-balances.md) (Approved 2026-11-19)_

## Approach
F5 adds no stored data. It reads the people (F3), the expenses with their stored shares (F4) and the payments (F6, not built yet), and turns them into one signed balance per person. The arithmetic lives in `src/domain/balances.ts` as a pure function: paid, minus shares, plus payments made, minus payments received (product.md R4). It takes the people, expenses and payments as plain arguments, so the zero-sum rule (F5.R6) and the worked examples are unit-tested without a database. The shares come from `expense_participants.share_cents` as F4 saved them, so F5 never repeats the split rule (F5.R2). Amounts are shown with F4's `formatCents` from `money.ts`: two decimals and thousands separators, e.g. "1,250.00" (F5.R4). F5 adds no formatter. The sign-to-words mapping, the row text and the section states live in `src/domain/balance-view.ts`, with the copy in `balance-messages.ts`.

Payments enter through a read-only `PaymentReader` port (F5.R12). F5 creates no payments. Until F6 supplies a real store, the production adapter checks that the trip belongs to the owner and returns no payments, the same way F3 reports no one as in use before F4 exists. The service `getBalances` in `src/services/` calls `requireUser` first, reads people, expenses and payments through their ports (each returns `null` for a trip the owner does not have, which becomes `not_found`), orders the people with F3's `sortOldestFirst`, and calls the pure function. The route handler only parses the request, calls the service and maps the result to a status code. The balances section is a client component on the trip page. It refetches whenever people or expenses change, through a change counter the trip page holds, so the rows always match the expenses on the page (F5.R9).

**Build dependency:** F4 must be built first (F4.T1–T14, which need F3 and F2 and F1). F5 is build step 5. F5 has no setup task of its own; the scaffold is F1.T1, as in F2–F4.

## Data model changes
None. Balances are calculated from the person, expense and expense participant records that F3 and F4 already store (spec › Data & contract). No migration is needed.

## Routes and API
All under `/api/trips/[id]/balances`. Every request requires a logged-in session. A logged-out request gets `401` `not_logged_in`. A trip owned by someone else and a missing trip return the same `404` `not_found` body (F2.R8, F5.R11). Errors use F1's shape `{ "error": { "code": string } }`.

| Method and path | Request | Success | Errors |
|---|---|---|---|
| `GET /api/trips/[id]/balances` | none | `200 { "balances": [{ "id", "name", "balanceCents" }] }`, in the order people were added (F5.R7). `balanceCents` is a whole number, positive for "is owed", negative for "owes", zero for "is settled" (F5.R3, F5.R4) | `401` `not_logged_in`; `404` `not_found`; `500` `internal` |

The display text is not sent by the API. The client builds the row text with `balance-view.ts`, so the money format lives in one place (CLAUDE.md › Money).

## Screens
- **Balances section** (on `/trips/[id]`, below the Expenses section from F4). Client component. Heading "Balances", the same heading level as Expenses (spec › Accessibility).
  - Loading: "Loading balances…".
  - Empty, trip has no people: "Add people to see balances." and no rows.
  - Loaded: one row per person, in the order added. Each row reads "[Name] is owed [amount]", "[Name] owes [amount]", or "[Name] is settled" (lowercase, no amount). Each row is one text unit, name first. No buttons (F5.R10).
  - All settled: every row reads "is settled". No extra message.
  - Failed to load: "We couldn't load balances. Try again." The rest of the trip page keeps working. The spec gives no retry button, so none is added.
  - The section refetches after any add or delete of a person or an expense on the page (F5.R9).

## Files changed
Paths are under `app/`. Source files only; test files are listed in each task.

| Path | New or changed | Why |
|---|---|---|
| `src/domain/balances.ts` | New | Pure balance calculation, product.md R4 and R5 (T2) |
| `src/domain/balance-view.ts` | New | Sign-to-words rows, section states (T3) |
| `src/domain/balance-messages.ts` | New | Approved copy from the spec's States & errors (T3) |
| `src/ports/payment-reader.ts` | New | `PaymentReader` port, read-only, with `PaymentRecord` (T4) |
| `tests/fakes/in-memory-payment-reader.ts` | New | Fake reader for the service tests, including the fake payment in F5.AC8 (T4) |
| `src/services/get-balances.ts` | New | Balances use case: session check, ports, pure calculation (T5) |
| `src/db/payment-reader.ts` | New | Production `PaymentReader`: owner check, then no payments until F6 (T6) |
| `src/lib/deps.ts` | Changed | Adds the payment reader next to the other stores (T6) |
| `src/app/api/trips/[id]/balances/route.ts` | New | Thin GET handler (T6) |
| `src/app/(app)/trips/[id]/balances-section.tsx` | New | Balances section and its states (T7) |
| `src/app/(app)/trips/[id]/trip-page.tsx` | Changed | Renders the balances section below Expenses and holds the change counter (T7) |
| `src/app/(app)/trips/[id]/expenses-section.tsx` | Changed | Calls `onChanged` after an add or delete so balances refetch (T7) |
| `src/app/(app)/trips/[id]/people-section.tsx` | Changed | Calls `onChanged` after an add or remove so balances refetch (T7) |

## Tasks

### F5.T1 — Amount format from F4 (reuse)
- **Files:** `app/tests/domain/money.test.ts` (changed: F5 cases added only)
- **Depends on:** F4.T1 (`formatCents` in `money.ts`)
- **Work:** No code is added. F5 reuses `formatCents` from F4.T1 for every balance amount (F5.R4): two digits after the decimal point, thousands separators between groups of three, no currency symbol. Callers pass the absolute value of a balance (the sign is shown in words, F5.R4), so F5 never passes a negative amount. This task only adds the F5 cases below to the F4 test file, so the balance format is tested where the formatter lives.
- **Tests:** `tests/domain/money.test.ts`: `F5.AC1 formats 5000 cents as 50.00`, `F5.AC3 formats 666 cents as 6.66`, `F5.AC1 formats 125000 cents as 1,250.00`, `F5.AC1 formats zero as 0.00`.
- **Done when:** `npm test` passes `money.test.ts`, including the F4 and F5 cases.

### F5.T2 — Balance calculation
- **Files:** `app/src/domain/balances.ts`, `app/tests/domain/balances.test.ts`
- **Depends on:** none (pure types only)
- **Work:** `computeBalances({ people, expenses, payments })` takes:
  - `people: readonly { id: string }[]`, in the order added (F3.R6).
  - `expenses: readonly { amountCents: number; payerId: string; participants: readonly { personId: string; shareCents: number }[] }[]`. The shares are the stored `share_cents` from F4. They are not recalculated.
  - `payments: readonly { payerId: string; payeeId: string; amountCents: number }[]`.

  It returns `{ id, balanceCents }[]` in the order of `people`, where `balanceCents` = the sum of `amountCents` for expenses paid − the sum of `shareCents` for the person's participant rows + the payments the person made − the payments they received (product.md R4). Integers only. If an expense or payment names a person not in `people`, the function throws an `Error`; it does not drop the row, so a bad reference is never shown as a wrong balance. An empty `people` gives an empty result.
- **Tests:** `tests/domain/balances.test.ts`: `F5.AC1 worked example 1 gives Sam 50.00 owed, Alex 10.00 owed and Jo 40.00 owed`, `F5.AC2 balances of worked example 1 add up to exactly zero`, `F5.AC3 10.00 shared three ways gives Sam 6.66 owed and Alex and Jo 3.33 each`, `F5.AC4 a payer who is not a participant is owed the full amount`, `F5.AC5 a person in no expense has a zero balance while the others balance`, `F5.AC6 people with no expenses all have a zero balance`, `F5.AC7 returns the balances in the order people were added`, `F5.AC8 a payment of 40.00 from Jo to Sam leaves Jo at zero, Sam owed 10.00 and Alex owing 10.00`, `F5.AC9 an expense left out of the input is not counted`, `F5.AC9 throws when an expense names a person not on the trip`.
- **Done when:** `npm test` passes the file. Every worked-example number in the tests matches product.md.

### F5.T3 — Balance view rules and copy
- **Files:** `app/src/domain/balance-view.ts`, `app/src/domain/balance-messages.ts`, `app/tests/domain/balance-view.test.ts`, `app/tests/domain/balance-messages.test.ts`
- **Depends on:** F5.T1, F5.T2, F4.T1 (`formatCents`)
- **Work:**
  - `balanceRow({ name, balanceCents })` returns `{ kind, text }`. Positive gives kind `"owed"` and text "[name] is owed [amount]". Negative gives kind `"owes"` and text "[name] owes [amount]", with the amount from `formatCents(-balanceCents)` (F4.T1), so it is shown as a positive number with separators. Zero gives kind `"settled"` and text "[name] is settled", with no amount. The name is used exactly as stored.
  - `balanceSectionState(request)` takes `"loading"`, `"failed"`, or `{ status: "loaded", balances }`, and returns `"loading"`, `"failed"`, `"empty"` (no people) or `"loaded"`.
  - `balance-messages.ts` exports the approved copy from the spec's States & errors, word for word: the heading "Balances", "Loading balances…", "Add people to see balances.", and "We couldn't load balances. Try again."
- **Tests:** `tests/domain/balance-view.test.ts`: `F5.AC1 a positive balance reads "is owed" with the amount`, `F5.AC1 a negative balance reads "owes" with a positive amount`, `F5.AC5 a zero balance reads "is settled" with no amount`, `F5.AC6 every zero balance reads "is settled"`, `F5.AC10 no people gives the empty state`, `F5.AC10 people with balances give the loaded state`, `F5.AC10 a request in flight gives the loading state`, `F5.AC10 a failed request gives the failed state`. `tests/domain/balance-messages.test.ts`: `F5.AC10 empty-state copy matches the approved text`, `F5.AC1 heading, loading and failed-load copy match the approved text`.
- **Done when:** `npm test` passes both files.

### F5.T4 — Payment reader port and fake
- **Files:** `app/src/ports/payment-reader.ts`, `app/tests/fakes/in-memory-payment-reader.ts`
- **Depends on:** F1.T4 (ports), F1.T5 (fakes convention)
- **Work:**
  - `PaymentRecord = { id, tripId, payerId, payeeId, amountCents: number, createdAt: Date }`.
  - `PaymentReader` with one method: `listByTrip(ownerId, tripId): Promise<PaymentRecord[] | null>`. It returns `null` when the trip is missing or not owned. The method is read-only: F5 adds no write method, and F6 adds the rest of the payment operations to this port.
  - `InMemoryPaymentReader` takes `trips: { id, ownerId }[]` and a list of payments, applies the owner check the same way the store does, and exposes `listCalls`.
- **Tests:** None. Interface and test helper, exercised by F5.T5.
- **Done when:** `npm run build` type-checks with the files present.

### F5.T5 — Get-balances service
- **Files:** `app/src/services/get-balances.ts`, `app/tests/services/get-balances.test.ts`
- **Depends on:** F5.T2, F5.T4, F3.T2 (`sortOldestFirst`), F3.T3 (`PersonStore` and fake), F4.T6 (`ExpenseStore` and fake), F4.T8 (`deleteExpense`, used in one test), F1.T15 (`requireUser`), F1.T5
- **Work:** `getBalances({ session, people, expenses, payments, now, logger }, { tripId })`.
  1. Call `requireUser` first. A refusal returns `not_logged_in` and makes no store call.
  2. Call `people.listByTrip(userId, tripId)`. `null` returns `not_found` with no data. Sort the result with `sortOldestFirst`.
  3. Call `expenses.listByTrip(userId, tripId)` and `payments.listByTrip(userId, tripId)`. A `null` from either returns `not_found` with no data.
  4. Map the expenses to the input of `computeBalances` (the stored participant shares, no recalculation). Call `computeBalances`.
  5. Return `{ ok: true, balances }` with each entry as `{ id, name, balanceCents }`, where `name` is read from the person record.

  If any store throws, or `computeBalances` throws, return `{ ok: false, error: "internal" }` with no balance data, and log the error with the trip id and no names or amounts. A failure is never shown as zero balances.
- **Tests:** `tests/services/get-balances.test.ts`: `F5.AC11 refuses a request with no session and reads nothing`, `F5.AC11 another owner's trip gives not_found and no balances`, `F5.AC6 a trip with people and no expenses shows every person settled`, `F5.AC7 the rows follow the order people were added`, `F5.AC8 a payment from the payment reader is included in the balances`, `F5.AC9 after deleteExpense, the next request leaves that expense out`, `F5.AC10 a trip with no people returns an empty list`, `F5.AC5 a person in no expense is settled in the returned rows`, `F5.AC1 returns Sam 50.00 owed, Alex 10.00 owing and Jo 40.00 owing for worked example 1`, `F5.AC11 a failed store read gives an internal error and no balances`.
- **Done when:** `npm test` passes the file.

### F5.T6 — Payment reader adapter, dependency wiring and balances route
- **Files:** `app/src/db/payment-reader.ts`, `app/src/lib/deps.ts` (changed), `app/src/app/api/trips/[id]/balances/route.ts`
- **Depends on:** F5.T4, F5.T5, F2.T8 (Drizzle trip store, owner check), F2.T9 (`deps.ts`), F4.T12 (`deps.ts` as changed by F4)
- **Work:**
  - `payment-reader.ts` exports `createPaymentReader(trips: TripStore)`, a `PaymentReader`. For `listByTrip(ownerId, tripId)`, it calls `trips.findForOwner(ownerId, tripId)`. A `null` result returns `null`. Otherwise it returns `[]`. The comment says that F6 replaces it with the real payment store. No payment is ever written here.
  - `deps.ts` adds the payment reader, built from the trip store, next to the other stores.
  - The route handler reads `id` from the URL, calls `getBalances` with the session, `now` and the logger, and maps the result: `not_logged_in` → 401, `not_found` → 404, `internal` → 500. It does not log the response or any name or amount. The owner comes only from the session.
- **Tests:** None in this task. The logic is tested in F5.T5. Code review checks the status mapping, that `createPaymentReader` filters by the owner through `findForOwner` and builds no SQL, and that no body or amount is logged.
- **Done when:** with the dev server running, `curl` shows `401` for the route when logged out, `404` for another user's trip, and `200` with `balances` in the order of the people added, with the expenses' shares reflected in `balanceCents`.

### F5.T7 — Balances section on the trip page
- **Files:** `app/src/app/(app)/trips/[id]/balances-section.tsx` (new), `app/src/app/(app)/trips/[id]/trip-page.tsx` (changed), `app/src/app/(app)/trips/[id]/expenses-section.tsx` (changed), `app/src/app/(app)/trips/[id]/people-section.tsx` (changed)
- **Depends on:** F5.T3, F5.T6, F3.T9 (`people-section.tsx`), F4.T13 and F4.T14 (`expenses-section.tsx`)
- **Work:**
  - `balances-section.tsx` is a client component. It fetches `GET /api/trips/[id]/balances` and chooses its state with `balanceSectionState`. It renders the states in Screens, with each row's text from `balanceRow`, and it refetches when its `version` prop changes.
  - `trip-page.tsx` holds a `version` counter, increments it on each change, and passes it to the balances section. It passes `onChanged` to the people and expenses sections. It renders the balances section below Expenses.
  - `expenses-section.tsx` and `people-section.tsx` call `onChanged` after a successful add or delete, and after a `404` that removes a row. Their other behaviour does not change.
- **Tests:** None in this task. The states and copy are tested in F5.T3 and the service in F5.T5. Checked by hand or in review: the failed state does not break the page; the rows change after an add or delete of an expense or a person, with no reload; a trip with no people shows the empty copy; each row reads as one unit in a screen reader; the section works by keyboard only (it has no controls).
- **Done when:** on a trip with Sam, Alex and Jo and the worked example 1 expenses, the section shows "Sam is owed 50.00", "Alex owes 10.00" and "Jo owes 40.00". Deleting Sam's 90.00 expense updates the rows without a reload, and a failed load shows the failed copy while the people and expenses sections still work.

## Acceptance criteria map
Spec ACs: 11 · Mapped: 11

| AC | Mapped to | Task |
|---|---|---|
| F5.AC1 | `F5.AC1 worked example 1 gives Sam 50.00 owed, Alex 10.00 owed and Jo 40.00 owed` in `tests/domain/balances.test.ts`; `F5.AC1 a positive balance reads "is owed" with the amount` in `tests/domain/balance-view.test.ts`; `F5.AC1 returns Sam 50.00 owed…` in `tests/services/get-balances.test.ts`; `F5.AC1 formats 125000 cents as 1,250.00` in `tests/domain/money.test.ts` | T1, T2, T3, T5 |
| F5.AC2 | `F5.AC2 balances of worked example 1 add up to exactly zero` in `tests/domain/balances.test.ts` | T2 |
| F5.AC3 | `F5.AC3 10.00 shared three ways gives Sam 6.66 owed and Alex and Jo 3.33 each` in `tests/domain/balances.test.ts`; `F5.AC3 formats 666 cents as 6.66` in `tests/domain/money.test.ts` | T1, T2 |
| F5.AC4 | `F5.AC4 a payer who is not a participant is owed the full amount` in `tests/domain/balances.test.ts` | T2 |
| F5.AC5 | `F5.AC5 a person in no expense has a zero balance while the others balance` in `tests/domain/balances.test.ts`; `F5.AC5 a zero balance reads "is settled" with no amount` in `tests/domain/balance-view.test.ts`; `F5.AC5 a person in no expense is settled in the returned rows` in `tests/services/get-balances.test.ts` | T2, T3, T5 |
| F5.AC6 | `F5.AC6 people with no expenses all have a zero balance` in `tests/domain/balances.test.ts`; `F5.AC6 every zero balance reads "is settled"` in `tests/domain/balance-view.test.ts`; `F5.AC6 a trip with people and no expenses shows every person settled` in `tests/services/get-balances.test.ts` | T2, T3, T5 |
| F5.AC7 | `F5.AC7 returns the balances in the order people were added` in `tests/domain/balances.test.ts`; `F5.AC7 the rows follow the order people were added` in `tests/services/get-balances.test.ts` | T2, T5 |
| F5.AC8 | `F5.AC8 a payment of 40.00 from Jo to Sam leaves Jo at zero, Sam owed 10.00 and Alex owing 10.00` in `tests/domain/balances.test.ts`; `F5.AC8 a payment from the payment reader is included in the balances` in `tests/services/get-balances.test.ts` | T2, T5 |
| F5.AC9 | `F5.AC9 an expense left out of the input is not counted` and `F5.AC9 throws when an expense names a person not on the trip` in `tests/domain/balances.test.ts`; `F5.AC9 after deleteExpense, the next request leaves that expense out` in `tests/services/get-balances.test.ts` | T2, T5 |
| F5.AC10 | `F5.AC10 no people gives the empty state` and related tests in `tests/domain/balance-view.test.ts`; `F5.AC10 empty-state copy matches the approved text` in `tests/domain/balance-messages.test.ts`; `F5.AC10 a trip with no people returns an empty list` in `tests/services/get-balances.test.ts` | T3, T5 |
| F5.AC11 | `F5.AC11 refuses a request with no session and reads nothing`, `F5.AC11 another owner's trip gives not_found and no balances`, and `F5.AC11 a failed store read gives an internal error and no balances` in `tests/services/get-balances.test.ts`. Code review: the balance query reads only the owner's trips, through the owner-filtered stores from F3.T7 and F4.T10 and the adapter in F5.T6 | T5, T6 |

## Sent back to spec
None.

## Decisions log
- 2026-11-19: No setup task in this plan. `app/` does not exist yet, and F1.T1 is the scaffold that F2–F4 rely on → repeating it here would duplicate F1.T1 and conflict with the approved F1–F4 plans.
- 2026-11-19: No task needs human approval. F5 has no migration, no auth, env, CI or deploy change, and deletes no test → the spec's Data & contract section says no new stored data.
- 2026-11-19: The balance formula is in one pure function that takes people, expenses and payments as arguments → F5.R1, product.md R4 and R5 are testable without a database, which project-rules requires.
- 2026-11-19: Balances use the shares stored by F4 (`share_cents`), not a fresh split → F5.R2 says F5 uses F4's shares, and stored values are exact even if the split rule changes later.
- 2026-11-19: Payments come through a read-only `PaymentReader` port, and the production adapter returns no payments after the owner check until F6 replaces it → F5.R12 says F5 creates no payments and must not wait for F6. This follows F3's pattern of a usage check that reports nothing in use until F4 exists.
- 2026-11-19: (Superseded by the amount-format entry below.) `formatCentsPlain` was to be added to `money.ts` for amounts with no separators.
- 2026-11-19: Amount format revised: the spec now settles thousands separators (F5.R4, F5.AC1, F5.AC3, Edge cases), so balances reuse F4's `formatCents` (F4 plan T1) and F5 changes no code in `money.ts`. The "Sent back to spec" item is cleared. T1 now only adds F5 test cases. Plan kept as Draft, not approved. Changed: Approach, Files changed (money.ts row removed), T1, T3, the AC map row for F5.AC1, Sent back to spec.
- 2026-11-19: The spec's Test plan still has the line "Amount formatting: two decimal places, no thousands separators (e.g. 1250.00) → F5.R4", which contradicts F5.R4 and F5.AC1. This plan follows F5.R4 and the ACs. The Test plan line needs fixing in the spec (`/spec-feature F5`) before approval; the spec is not edited here.
- 2026-11-19: Approve F5 plan? → Yes, approved by the user. Status set to Approved. Sent-back items: none open. The spec's Test plan line was aligned with F5.R4 the same day (spec Decisions log), so the plan matches the spec.
- 2026-11-19: The API returns whole cents and the row text is built in the client → CLAUDE.md › Money says formatting happens once, in `money.ts`, and the API stays numeric.
- 2026-11-19: The trip page holds a change counter that the people and expenses sections call → F5.R9 requires the rows to match the page after an add or delete, without a reload or polling. The alternative of sharing state across sections was not needed.
- 2026-11-19: The balances route has no unit tests of its own; its status mapping is checked in code review → routes are thin and the logic is tested in the service, as F3.T8 and F4.T12 do.
- 2026-11-19: `computeBalances` throws on a person id not on the trip, rather than skipping the row → a bad reference should fail loudly, not show a wrong balance. The service returns `internal` for it.
