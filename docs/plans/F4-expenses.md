# F4 — Expenses · Plan

_Status: Approved · Last updated: 2026-11-19 · Spec: [F4-expenses.md](../specs/features/F4-expenses.md) (Approved 2026-11-19)_

## Approach
F4 adds the expense record, its participant rows, and four operations: list, add, delete, and the "is this person in an expense?" check that F3's removal reads. Pure rules go in `src/domain/`: the description check (trim, blank, 100 characters), the amount parser that turns the typed text into whole cents (`money.ts`, the one place where input becomes cents, per CLAUDE.md), the equal split with leftover cents (`split.ts`), the newest-first order, the form defaults, the dialog choice and the copy. None of these import the database, Next.js, iron-session or argon2. Each operation is a service in `src/services/` that receives the session, the `ExpenseStore` port, the `PersonStore` port from F3, `now`, `newId` and the logger. Every service calls `requireUser` (F1.T15) first, so the owner always comes from the session (F4.R14). `addExpense` validates everything, reads the trip's people through F3's `PersonStore`, checks that the payer and every participant are on the trip (F4.R12), computes the shares, and only then calls the store. Nothing is written if any check fails (F4.R6). The Drizzle store checks trip ownership and the people's trip membership again inside one transaction, so a person removed between the check and the write cannot slip in. Shares are computed once at save time and stored in `expense_participants.share_cents`, so F5 and F6 read exact stored values. The removal check is a new `ExpenseUsage` port. It is composed with F3's `PersonUsage` port in `src/services/person-usage.ts`, so the F4.AC19 rule is unit-tested with a fake. The F3 stub that reports nobody as in use is replaced. The route handlers only parse the request, call a service and map the result to a status code. The expenses section and the add and delete dialogs are client components on the trip page built in F2 and extended in F3.

**Build dependency:** F3 must be built first (F3.T1–T9, which in turn needs F2 and F1). F4 is build step 4. `app/` does not exist yet, so F4 depends on the scaffold task F1.T1.

## Data model changes
Two new tables. Both reference `people(id)` with **`ON DELETE NO ACTION`** (SQLite's default; no `ON DELETE CASCADE`), as F3's plan requires, so the database refuses to delete a person who is still in an expense (F3.R9, F4.R13). The foreign keys must not use `RESTRICT`. SQLite checks `RESTRICT` immediately, but checks `NO ACTION` only at the end of the statement. A trip delete removes its people and expenses in one statement (F2.R9, F4.R11), so with `RESTRICT` the trip delete would fail on the people rows before the expenses are gone. With `NO ACTION`, the check runs after the cascade has removed the expenses and participant rows, so the trip delete succeeds, and a delete of a person who is still in an expense is refused.

**`expenses`** (new)

| Column | Type | Constraints |
|---|---|---|
| `id` | TEXT | PRIMARY KEY (UUID from `newId`) |
| `trip_id` | TEXT | NOT NULL, REFERENCES `trips(id)` ON DELETE CASCADE (F4.R11, F2.R9) |
| `description` | TEXT | NOT NULL, CHECK (`length(description) BETWEEN 1 AND 100`); stored trimmed |
| `amount_cents` | INTEGER | NOT NULL, CHECK (`amount_cents > 0 AND amount_cents <= 100000000`) |
| `payer_id` | TEXT | NOT NULL, REFERENCES `people(id)` ON DELETE NO ACTION, not RESTRICT (F4.R3, F3.R9) |
| `position` | INTEGER | NOT NULL, order within the trip (F4.R7 tie-break) |
| `created_at` | TEXT | NOT NULL (ISO 8601, UTC) |

Constraints and indexes: `UNIQUE (trip_id, position)`; index on `expenses(payer_id)` for the usage check.

**`expense_participants`** (new): one row per participant.

| Column | Type | Constraints |
|---|---|---|
| `expense_id` | TEXT | NOT NULL, REFERENCES `expenses(id)` ON DELETE CASCADE (deleting an expense removes its rows) |
| `person_id` | TEXT | NOT NULL, REFERENCES `people(id)` ON DELETE NO ACTION, not RESTRICT (F3.R9) |
| `share_cents` | INTEGER | NOT NULL, CHECK (`share_cents >= 0`) |

Constraints and indexes: `PRIMARY KEY (expense_id, person_id)`; index on `expense_participants(person_id)` for the usage check.

Not enforced by the database, checked in code review and in the store's transaction: that `payer_id` and each `person_id` belong to the expense's trip (F4.R12), that the shares add up to `amount_cents`, that there is at least one participant, and that the `description` check uses code points the same way the domain does. A composite foreign key `(person_id, trip_id)` was considered and not used, because it would change F3's approved `people` table (see Decisions log).

## Routes and API
All under `/api/trips/[id]/expenses`. Bodies are JSON. Errors use F1's shape `{ "error": { "code": string, "field"?: string } }`. Every route requires a logged-in session. A logged-out request gets `401` `not_logged_in`. A trip owned by someone else and a missing trip return the same `404` `not_found` body (F2.R8, F4.R14). Money is sent as whole cents in responses. The amount in a request is a **string** of digits, for example `"10.50"`, so the request never passes through a float. A JSON number in `amount` is refused with `invalid_amount`.

Expense object in responses: `{ id, description, amountCents, payerId, payerName, addedAt }`, `addedAt` as ISO UTC. Shares are not returned (F4.R8); F5 reads them.

| Method and path | Request | Success | Errors |
|---|---|---|---|
| `GET /api/trips/[id]/expenses` | none | `200 { "expenses": [...] }`, newest first | `401` `not_logged_in`; `404` `not_found`; `500` `internal` |
| `POST /api/trips/[id]/expenses` | `{ description, amount, payerId, participantIds }` | `201 { "expense": {...} }` | `400` `blank_description` or `description_too_long` (`field` `description`); `400` `invalid_amount`, `amount_comma`, `too_many_decimals` or `amount_too_large` (`field` `amount`); `400` `payer_required` (`field` `payerId`); `400` `participants_required` (`field` `participantIds`); `400` `person_not_on_trip`; `400` `invalid_body` for unparseable JSON; `401`; `404` `not_found`; `500` `internal` (no description or amount logged) |
| `DELETE /api/trips/[id]/expenses/[expenseId]` | none | `200 { "ok": true }` | `404` `not_found` (also for a second delete, F4 edge case); `401`; `500` `internal` |

Routes map service results: `not_logged_in` → 401, `not_found` → 404, `person_not_on_trip` and all validation codes → 400, `internal` → 500. There is no `PATCH` route (no editing, F4 Out of scope).

## Screens
- **Expenses section** (on `/trips/[id]`, below the People section from F3): client component. Heading "Expenses". Shown only once the trip has loaded.
  - Loading: "Loading expenses…".
  - Empty, trip has people: "No expenses yet. Add the first one." and an "Add expense" button.
  - Empty, trip has no people: "Add people to this trip before you add an expense." and no "Add expense" button (F4.AC20).
  - Loaded: one row per expense, newest first, showing description, amount (`formatCents`), payer's name and the date added (`formatTripDate`, F4.R8). Each row has a "Delete" button whose accessible name is "Delete [description], [amount]".
  - Failed to load: "We couldn't load the expenses. Try again." and a "Try again" button that fetches the list again. The rest of the trip page is unchanged (F4.AC27).
- **Add expense form** (opened by "Add expense"): fields "Description", "Amount", "Paid by" (a radio group over the trip's people, nothing selected), "Shared by" (a checkbox per person, all ticked). Errors come from `expense-messages.ts`, are linked with `aria-describedby`, and the typed values are kept on failure. While in flight, "Save expense" is disabled and reads "Saving…". On success the form closes and the new row is added at the top. Cancel closes the form.
- **Delete dialog** (native `<dialog>`, `showModal()`, as in F2 and F3): title "Delete [description]?", body "This removes the expense. This can't be undone.", buttons "Delete expense" and "Cancel". Confirm disables both buttons and shows "Deleting…". Success removes the row. A `404` closes the dialog, refreshes the list and shows no other message. Any other failure shows "We couldn't delete this expense. Try again." and the row stays. Cancel and Escape change nothing. Focus returns to the Delete button that opened it.

## Files changed
Paths are under `app/`. Source files only; test files are listed in each task.

| Path | New or changed | Why |
|---|---|---|
| `src/domain/money.ts` | New | Amount text to whole cents, and cents to display text (T1) |
| `src/domain/expense-description.ts` | New | Description rule: trim, blank, 100 characters (T2) |
| `src/domain/split.ts` | New | Equal split with leftover cents by trip order (T3) |
| `src/domain/expense-view.ts` | New | Newest-first order, section states, add-form defaults, delete-dialog choice (T4) |
| `src/domain/expense-messages.ts` | New | Approved copy from the spec's States & errors, and the error-code-to-copy map (T5) |
| `src/ports/expense-store.ts` | New | `ExpenseStore` interface and record types (T6) |
| `src/ports/expense-usage.ts` | New | `ExpenseUsage` interface: "is this person in an expense?" (T6) |
| `tests/fakes/in-memory-expense-store.ts` | New | In-memory store that also implements `ExpenseUsage`, with owner and trip checks and call counts (T6) |
| `src/services/add-expense.ts` | New | Add use case with all validation and the trip membership check (T7) |
| `src/services/list-expenses.ts` | New | List use case, newest first, with payer names (T8) |
| `src/services/delete-expense.ts` | New | Delete use case (T8) |
| `src/services/person-usage.ts` | New | Composes the expense check into F3's `PersonUsage` port (T11) |
| `src/db/schema.ts` | Changed | Adds `expenses` and `expense_participants` tables (T9) |
| `drizzle/*.sql` | New (generated) | Migration for the two tables (T9) |
| `src/db/expense-store.ts` | New | `ExpenseStore` on Drizzle: owner and trip checks, transactional add and delete (T10) |
| `src/db/expense-usage.ts` | New | `ExpenseUsage` on Drizzle. Replaces F3's `src/db/person-usage.ts` stub, which is deleted in this task (T11) |
| `src/lib/deps.ts` | Changed | Adds the expense store and the composed `PersonUsage` in place of F3's stub (T12) |
| `src/app/api/trips/[id]/expenses/route.ts` | New | Thin list and add handlers (T12) |
| `src/app/api/trips/[id]/expenses/[expenseId]/route.ts` | New | Thin delete handler (T12) |
| `src/app/(app)/trips/[id]/expenses-section.tsx` | New | Expenses section: loading, empty, loaded, and the delete action (T13) |
| `src/app/(app)/trips/[id]/delete-expense-dialog.tsx` | New | Delete confirm dialog (T13) |
| `src/app/(app)/trips/[id]/trip-page.tsx` | Changed | Renders the expenses section below People (T13) |
| `src/app/(app)/trips/[id]/add-expense-form.tsx` | New | Add expense form with its errors and in-flight state (T14) |
| `src/app/(app)/trips/[id]/expenses-section.tsx` | Changed | Opens the add form from the Add expense button (T14) |

## Tasks

### F4.T1 — Amount rules and money formatting
- **Files:** `app/src/domain/money.ts`, `app/tests/domain/money.test.ts`
- **Depends on:** F1.T1 (scaffold)
- **Work:** `parseAmountToCents(raw: unknown)` returns `{ ok: true, cents }` or `{ ok: false, code }`, with codes `invalid_amount`, `amount_comma`, `too_many_decimals` and `amount_too_large`. Checks run in this order, and the first failure wins:
  1. A non-string returns `invalid_amount`.
  2. Any comma returns `amount_comma` (no comma is removed silently).
  3. The text must match `^\d+(\.\d+)?$`. Anything else returns `invalid_amount`. This covers empty text, a sign, letters, spaces, ".5" and "10.". Spaces are not trimmed for amounts.
  4. More than two digits after the decimal point returns `too_many_decimals`. Nothing is rounded.
  5. The cents are built as the whole digits followed by the decimal digits padded to two places, and converted with `BigInt`. No float is used. Zero returns `invalid_amount`.
  6. Above 100000000 cents (1,000,000.00) returns `amount_too_large`.
  `formatCents(cents)` returns "90.00", "1,000.00" and "1,000,000.00" (two decimals, thousands separators).
- **Tests:** `tests/domain/money.test.ts`: `F4.AC5 refuses zero, 0.00 and a negative amount`; `F4.AC5 refuses text that is not a number`; `F4.AC6 refuses three digits after the decimal point and does not round`; `F4.AC7 refuses an amount above 1,000,000.00`; `F4.AC7 accepts exactly 1,000,000.00`; `F4.AC24 refuses an amount containing a comma`; `F4.AC25 accepts "10", "10.5" and "10.50" as 1000, 1050 and 1050 cents`; `F4.AC26 refuses ".5" and "10."`; `F4.AC11 formats 1000 cents as 10.00`; `F4.AC7 formats 100000000 cents as 1,000,000.00`.
- **Done when:** `npm test` passes the file.

### F4.T2 — Description rule
- **Files:** `app/src/domain/expense-description.ts`, `app/tests/domain/expense-description.test.ts`
- **Depends on:** F1.T1
- **Work:** `validateExpenseDescription(raw: unknown)` returns `{ ok: true, description }` with the trimmed text, or `{ ok: false, code }` with `blank_description` (non-string, or empty after `trim()`) or `description_too_long` (more than 100 code points after trimming). Length uses `[...text].length`, as F3.T1 does. Inner spaces are kept.
- **Tests:** `tests/domain/expense-description.test.ts`: `F4.AC2 refuses an empty description`; `F4.AC2 refuses a description of only spaces`; `F4.AC3 accepts 100 characters and refuses 101`; `F4.AC3 counts after trimming`; `F4.AC4 removes leading and trailing spaces`; `F4.AC4 keeps spaces inside the description`; `F4.AC3 counts characters by code point`.
- **Done when:** `npm test` passes the file.

### F4.T3 — Equal split
- **Files:** `app/src/domain/split.ts`, `app/tests/domain/split.test.ts`
- **Depends on:** F1.T1
- **Work:** `splitEqually(amountCents: number, participantIds: readonly string[])` returns `{ personId, shareCents }[]` in the order given. Each share is `Math.floor(amountCents / n)` on integers. The leftover `amountCents − share × n` goes one cent each to the first participants in the list. The caller passes the participants in trip order (F3.R6), so the earliest-added get the leftover, and people who are not participants are not in the list. An empty list throws, because the service guarantees at least one participant. The shares always sum to `amountCents`.
- **Tests:** `tests/domain/split.test.ts`: `F4.AC11 splits 10.00 among three as 3.34, 3.33, 3.33`; `F4.AC11 the shares add up to the amount in every case`; `F4.AC12 splits 90.00 among three as 30.00 each`; `F4.AC13 gives the leftover cent to the earliest-added participant`; `F4.AC23 skips a person who is not a participant: 0.05 gives Alex 0.03 and Jo 0.02`; `F4.AC13 throws for an empty participant list`.
- **Done when:** `npm test` passes the file.

### F4.T4 — Expense view rules
- **Files:** `app/src/domain/expense-view.ts`, `app/tests/domain/expense-view.test.ts`
- **Depends on:** F4.T1, F4.T2, F2.T2 (`formatTripDate`, imported from `trip-view.ts` for the date label)
- **Work:**
  - `sortNewestFirst(expenses)` orders by `createdAt` descending, then by `position` descending, so the one saved later comes first when the times are equal (F4.R7).
  - `expenseSectionState(request)` takes `"loading"`, `"failed"`, or `{ status: "loaded", expenses, peopleCount }`, and returns `"loading"`, `"failed"`, `"empty"`, `"empty_no_people"` (no expenses and no people) or `"loaded"`.
  - `canAddExpense(peopleCount)` is `false` when there are no people (F4.R15).
  - `addFormDefaults(people)` returns `{ payerId: null, participantIds: [every person's id] }` (F4.R3, F4.R4).
  - `deleteDialogChoice(choice)` returns `{ callDelete: true }` only for `"confirm"`.
- **Tests:** `tests/domain/expense-view.test.ts`: `F4.AC15 sorts newest first`; `F4.AC15 on equal times the later save is listed first`; `F4.AC15 a loaded list gives the loaded state`; `F4.AC27 a failed list request gives the failed state`; `F4.AC20 a trip with no people and no expenses gives the no-people empty state`; `F4.AC20 Add expense is not offered when the trip has no people`; `F4.AC8 the form opens with no payer selected`; `F4.AC9 the form opens with every person ticked`; `F4.AC16 cancel does not call delete`; `F4.AC17 confirm calls delete`.
- **Done when:** `npm test` passes the file.

### F4.T5 — Expense copy and error mapping
- **Files:** `app/src/domain/expense-messages.ts`, `app/tests/domain/expense-messages.test.ts`
- **Depends on:** F4.T1, F4.T2, F4.T4
- **Work:** Exports the copy from the spec's States & errors, word for word: loading, failed-load (with its "Try again" button), empty (both), the "Add expense" button, the description, amount, payer and participant messages, the "Reload the page" message, the save failure, the delete dialog title, body and buttons, the delete failure, the form labels, the section heading, and the in-flight labels. `messageForCode(code)` maps every code from T1, T2, the payer and participant codes, and `person_not_on_trip` to its approved copy, with `field` where the message sits next to a field. `deleteDialogText(description)` returns the title "Delete [description]?". `deleteButtonLabel(description, amountText)` returns "Delete [description], [amount]" for the accessible name.
- **Tests:** `tests/domain/expense-messages.test.ts`: `F4.AC2 blank-description copy matches the approved text`; `F4.AC3 length copy matches the approved text`; `F4.AC5 zero-amount copy matches the approved text`; `F4.AC26 partial amounts use the zero-amount copy`; `F4.AC6 decimal-places copy matches the approved text`; `F4.AC7 maximum-amount copy matches the approved text`; `F4.AC24 comma copy matches the approved text`; `F4.AC8 payer copy matches the approved text`; `F4.AC9 participant copy matches the approved text`; `F4.AC18 reload copy matches the approved text`; `F4.AC1 save failure copy matches the approved text`; `F4.AC17 delete dialog and failure copy match the approved text`; `F4.AC15 section headings and empty and loading copy match the approved text`; `F4.AC27 failed-load copy and Try again label match the approved text`; `F4.AC20 empty copy for a trip with no people matches the approved text`.
- **Done when:** `npm test` passes the file.

### F4.T6 — Expense store port, usage port and fake
- **Files:** `app/src/ports/expense-store.ts`, `app/src/ports/expense-usage.ts`, `app/tests/fakes/in-memory-expense-store.ts`
- **Depends on:** F3.T3 (`PersonStore` and its fake), F1.T5 (fakes convention)
- **Work:**
  - `ExpenseRecord = { id, tripId, description, amountCents, payerId, createdAt: Date, position, participants: { personId, shareCents }[] }`.
  - `ExpenseStore`, every method takes `ownerId`:
    - `listByTrip(ownerId, tripId): Promise<ExpenseRecord[] | null>`. `null` when the trip is missing or not owned.
    - `add(ownerId, tripId, input: { id, description, amountCents, payerId, createdAt, participants })`. Returns `{ ok: true, expense }` with `position` set to the trip's maximum plus one, `{ ok: false, reason: "trip_not_found" }`, or `{ ok: false, reason: "person_not_on_trip" }`.
    - `deleteForOwner(ownerId, tripId, expenseId): Promise<{ ok: true } | { ok: false, reason: "not_found" }>`.
  - `ExpenseUsage`: `isPersonInExpense(personId): Promise<boolean>`, true when the person is the payer of any expense or a row in `expense_participants`.
  - `InMemoryExpenseStore` takes `trips: { id, ownerId }[]` and `people: { id, tripId }[]`, keeps expenses in a Map, enforces owner and trip membership the same way the store does, assigns positions, and exposes `records`, `writeCount`, `listCalls`, `deleteCalls`. It implements `ExpenseUsage` too.
- **Tests:** None. Interfaces and test helpers, exercised by T7, T8 and T11.
- **Done when:** `npm run build` type-checks with the files present.

### F4.T7 — Add-expense service
- **Files:** `app/src/services/add-expense.ts`, `app/tests/services/add-expense.test.ts`
- **Depends on:** F4.T1, F4.T2, F4.T3, F4.T6, F3.T3 (`PersonStore`), F1.T15 (`requireUser`), F1.T5
- **Work:** `addExpense({ session, expenses, people, newId, now, logger }, { tripId, description, amount, payerId, participantIds })`. The steps run in this order, and any failure returns before a write:
  1. `requireUser({ session, now })`. A refusal returns `not_logged_in` with no store call.
  2. `validateExpenseDescription(description)`. Failure returns its code.
  3. `parseAmountToCents(amount)`. Failure returns its code.
  4. `payerId` must be a non-empty string, else `payer_required`.
  5. `participantIds` must be an array of strings. Duplicates are removed. An empty result returns `participants_required`.
  6. `people.listByTrip(userId, tripId)`. `null` returns `not_found`. A throw returns `internal`, with no data logged.
  7. The payer and every participant must appear in that list, else `person_not_on_trip`. The participants are kept in the list's order (oldest first).
  8. `splitEqually(cents, participantIds in trip order)`.
  9. `expenses.add(userId, tripId, { id: newId(), description, amountCents, payerId, createdAt: now(), participants: shares })`. `trip_not_found` maps to `not_found`. `person_not_on_trip` passes through. A throw returns `internal`.
  On success, log `{ tripId, expenseId, ownerId }` with "expense added". Never log the description or the amount.
- **Tests:** `tests/services/add-expense.test.ts`: `F4.AC1 saves a valid expense on the trip`; `F4.AC2 writes nothing for a blank description`; `F4.AC3 writes nothing for a description over 100 characters`; `F4.AC4 saves the trimmed description`; `F4.AC5 writes nothing for an amount of zero`; `F4.AC6 writes nothing for three decimal places`; `F4.AC7 writes nothing above 1,000,000.00`; `F4.AC24 writes nothing for an amount with a comma`; `F4.AC8 refuses a missing payer and writes nothing`; `F4.AC9 refuses an empty participant list and writes nothing`; `F4.AC10 saves an expense whose payer is not a participant`; `F4.AC11 stores the shares 3.34, 3.33 and 3.33 for 10.00`; `F4.AC14 saves two expenses with the same description`; `F4.AC18 refuses a payer who is not on this trip and writes nothing`; `F4.AC18 refuses a participant who is not on this trip and writes nothing`; `F4.AC18 refuses a person id that does not exist and writes nothing`; `F4.AC21 refuses a request with no session and writes nothing`; `F4.AC21 a trip owned by another user gives not_found and writes nothing`; `F4.AC1 a failed save gives an internal error and saves nothing`.
- **Done when:** `npm test` passes the file.

### F4.T8 — List-expenses and delete-expense services
- **Files:** `app/src/services/list-expenses.ts`, `app/src/services/delete-expense.ts`, `app/tests/services/list-expenses.test.ts`, `app/tests/services/delete-expense.test.ts`
- **Depends on:** F4.T4, F4.T6, F3.T3, F1.T15, F1.T5
- **Work:**
  - `listExpenses({ session, expenses, people, now, logger }, { tripId })`: `requireUser` first. Then `expenses.listByTrip(userId, tripId)`. `null` returns `not_found` with no data. A throw returns `internal` with no data. Otherwise, the payer's name is read from `people.listByTrip` and each expense is mapped to `{ id, description, amountCents, payerId, payerName, addedAt }`, sorted by `sortNewestFirst`. Shares are not returned.
  - `deleteExpense({ session, expenses, now, logger }, { tripId, expenseId })`: `requireUser` first. Then `expenses.deleteForOwner(userId, tripId, expenseId)`. `not_found` is passed through with no other effect. On success, log `{ tripId, expenseId, ownerId }` with "expense deleted".
- **Tests:** `tests/services/list-expenses.test.ts`: `F4.AC1 a newly added expense is listed first`; `F4.AC15 returns only this trip's expenses with payer names`; `F4.AC15 returns them newest first`; `F4.AC21 refuses a request with no session and reads nothing`; `F4.AC21 another user's trip gives not_found and no expenses`; `F4.AC15 a failed store read gives an internal error and no expenses`; `F4.AC27 a failed list read gives internal and no expenses for the failed state`. `tests/services/delete-expense.test.ts`: `F4.AC17 removes the expense`; `F4.AC17 a second delete of the same expense gives not_found`; `F4.AC21 refuses a request with no session and deletes nothing`; `F4.AC21 another user's expense gives not_found and nothing is deleted`.
- **Done when:** `npm test` passes both files.

### F4.T9 — Expenses tables schema and migration
- **Files:** `app/src/db/schema.ts` (changed), `app/drizzle/` (generated)
- **Depends on:** F3.T6 (`people` table), F2.T7 (`trips` table)
- **Work:** Add `expenses` and `expense_participants` as in Data model changes: foreign keys as listed, `ON DELETE CASCADE` only on `trip_id` and on `expense_id`, `ON DELETE NO ACTION` (not `RESTRICT`) on `payer_id` and `person_id`, the CHECKs, `UNIQUE (trip_id, position)`, the primary key on `(expense_id, person_id)`, and the two indexes. Run `npm run db:generate`, then apply with `npm run db:migrate`.
- **Tests:** None. Database constraints are checked in code review (CLAUDE.md › Folder layout).
- **Done when:** `npm run db:migrate` runs on a local file that has F3's tables. A 0-cent or 100000001-cent expense is refused by the CHECK. Deleting a person who is a payer or a participant of an expense is refused by the foreign key. Deleting a trip that has people and expenses succeeds and removes all of them, with their participant rows.
- **Needs human approval:** yes — database migration.

### F4.T10 — Drizzle expense store
- **Files:** `app/src/db/expense-store.ts`
- **Depends on:** F4.T6, F4.T9
- **Work:** `createExpenseStore(db)` returns an `ExpenseStore`. Every query uses Drizzle's parameterised builders.
  - `listByTrip` first checks that the trip belongs to the owner (`trips.id = ? AND owner_id = ?`). If not, it returns `null`. Otherwise it selects the trip's expenses with their participants, ordered by `created_at` descending, then `position` descending.
  - `add` runs inside `db.transaction`. It checks trip ownership, then checks that the payer and every participant are rows in `people` with the same `trip_id`. A failed check returns `trip_not_found` or `person_not_on_trip`. Otherwise it sets `position` to the trip's maximum plus one (or 1), inserts the expense, then inserts the participant rows. A foreign-key violation on insert, because a person was removed in a race, returns `person_not_on_trip`. Other errors are rethrown.
  - `deleteForOwner` runs inside `db.transaction`. It deletes `expenses` where `id`, `trip_id` match and the trip's `owner_id` matches, and returns `not_found` when no row changed. Participant rows go with it through the cascade.
- **Tests:** None. Checked in code review: every query filters on the owner through `trips`; no SQL is built from strings; `add` and `deleteForOwner` are each one transaction; the membership check covers the payer and every participant; the foreign-key violation is mapped only to `person_not_on_trip`; no error is swallowed (CLAUDE.md › Folder layout; project-rules.md › Testing).
- **Done when:** code review passes, and a script that adds an expense with a removed participant gets `person_not_on_trip`, with nothing written.

### F4.T11 — Expense usage for F3's removal check
- **Files:** `app/src/db/expense-usage.ts` (new), `app/src/db/person-usage.ts` (deleted, F3's stub), `app/src/services/person-usage.ts`, `app/tests/services/person-usage.test.ts`
- **Depends on:** F4.T6, F4.T9, F3.T5 (`removePerson`)
- **Work:**
  - `createExpenseUsage(db)` returns an `ExpenseUsage`. `isPersonInExpense(personId)` is true when `expenses.payer_id = ?` or `expense_participants.person_id = ?` has a row. Parameterised queries only.
  - `makePersonUsage({ expenses }: { expenses: ExpenseUsage }): PersonUsage` returns `{ isInUse: (personId) => expenses.isPersonInExpense(personId) }`. F6 adds its payment check here later. This file imports only ports, so it is unit-tested with the fake.
  - F3's `src/db/person-usage.ts` stub is deleted. F3's rule that a removal is refused while the person is in use is unchanged.
- **Tests:** `tests/services/person-usage.test.ts`: `F4.AC19 reports a payer as in use`; `F4.AC19 reports a participant as in use`; `F4.AC19 reports a person in no expense as not in use`; `F4.AC19 removing a payer is refused and the person stays` (runs F3's `removePerson` with `makePersonUsage` and the fake store).
- **Done when:** `npm test` passes the file. Code review checks that `createExpenseUsage` filters only by the parameter and builds no SQL from strings.

### F4.T12 — Dependency wiring and expense routes
- **Files:** `app/src/lib/deps.ts` (changed), `app/src/app/api/trips/[id]/expenses/route.ts`, `app/src/app/api/trips/[id]/expenses/[expenseId]/route.ts`
- **Depends on:** F4.T7, F4.T8, F4.T10, F4.T11, F3.T8 (`deps.ts` and people routes)
- **Work:** `deps.ts` builds the expense store and `makePersonUsage({ expenses: createExpenseUsage(db) })` in place of F3's `createPersonUsage()`. The route handlers parse the JSON body (`400 invalid_body` on POST), read `id` and `expenseId` from the URL, call the service and map results to the statuses in the Routes table. The amount is passed through as the string it was sent as. The handlers never log request bodies, descriptions or amounts. The owner comes only from the session.
- **Tests:** None. Routes are thin and the logic is in the tested services. Code review checks the status mapping, the `field` names, and that no body is logged.
- **Done when:** with the dev server running, `curl` shows `401` on each route when logged out; `201` for a valid POST with `amount: "10.50"` and the saved shares in the database; `400 invalid_amount` for `amount: 10.5` as a JSON number; `400 payer_required` with no payer; `400 person_not_on_trip` for a person of another trip; `200` with the list newest first on GET; `404` for another user's trip; `200 { "ok": true }` for a DELETE, and `404` for the second DELETE. A person who is a payer cannot be removed through `DELETE /api/trips/[id]/people/[personId]` (`409 in_use`).

### F4.T13 — Expenses section and delete dialog on the trip page
- **Files:** `app/src/app/(app)/trips/[id]/expenses-section.tsx`, `app/src/app/(app)/trips/[id]/delete-expense-dialog.tsx`, `app/src/app/(app)/trips/[id]/trip-page.tsx` (changed)
- **Depends on:** F4.T4, F4.T5, F4.T12, F3.T9 (people section and trip page), F2.T13
- **Work:** `expenses-section.tsx` is a client component. It fetches `GET /api/trips/[id]/expenses` and `GET /api/trips/[id]/people`, and chooses the state with `expenseSectionState`. It renders the states in Screens. Rows show description, `formatCents` amount, payer name and `formatTripDate` date, newest first. "Add expense" is shown only when `canAddExpense` is true. Delete opens the dialog with the row's description. The dialog follows Screens and Accessibility. Confirm sends `DELETE` only when `deleteDialogChoice` allows it. `404` closes the dialog and refreshes the list. `trip-page.tsx` renders the section below the People section. A failed list load shows the failed state with its "Try again" button, which fetches the list again (F4.AC27).
- **Tests:** None in this task. The rules are tested in T4 and T5. Focus behaviour and the refresh after a `404` are checked by hand or in review.
- **Done when:** a trip with no people shows the no-people message and no Add button. A failed load shows the failed copy with its Try again button, and Try again loads the list (F4.AC27). A trip with expenses lists them newest first with payer and date. Cancel leaves the expense. Confirm removes it. An expense deleted in another tab disappears with no message. A failed delete keeps the row and shows the failure copy. The whole flow works by keyboard only.

### F4.T14 — Add expense form
- **Files:** `app/src/app/(app)/trips/[id]/add-expense-form.tsx`, `app/src/app/(app)/trips/[id]/expenses-section.tsx` (changed)
- **Depends on:** F4.T13, F4.T4, F4.T5
- **Work:** `add-expense-form.tsx` is a client component with the fields Description, Amount (text, digits and one point), Paid by (a radio group, nothing selected) and Shared by (a checkbox per person, all ticked, in a `fieldset` with a legend "Shared by"). Initial values come from `addFormDefaults`. It posts to `POST /api/trips/[id]/expenses` with `amount` as the typed string. A `400` shows the message for its `code` next to its `field` (`messageForCode`), and keeps the typed values. A `400 person_not_on_trip` shows the reload copy. Any other failure shows the save failure copy. In flight, "Save expense" is disabled and reads "Saving…". Success closes the form and prepends the new expense to the list. Cancel closes the form. `expenses-section.tsx` opens the form from "Add expense".
- **Tests:** None in this task. The copy and defaults are tested in T4 and T5. Double-submit prevention, error linking, and keyboard operation are checked by hand or in review.
- **Done when:** each validation case in States & errors shows its approved copy next to its field and saves nothing. A new expense appears at the top. Save is disabled while in flight, and a double click sends one request. Shares for the example "10.00 shared by Sam, Alex and Jo" show 3.34, 3.33, 3.33 in the database.

## Acceptance criteria map
Spec ACs: 27 · Mapped: 27

| AC | Mapped to | Task |
|---|---|---|
| F4.AC1 | `F4.AC1 saves a valid expense on the trip` and `F4.AC1 a failed save gives an internal error and saves nothing` in `tests/services/add-expense.test.ts`; `F4.AC1 a newly added expense is listed first` in `tests/services/list-expenses.test.ts`; `F4.AC1 save failure copy matches the approved text` in `tests/domain/expense-messages.test.ts` | T5, T7, T8 |
| F4.AC2 | `F4.AC2 refuses an empty description` and `F4.AC2 refuses a description of only spaces` in `tests/domain/expense-description.test.ts`; `F4.AC2 writes nothing for a blank description` in `tests/services/add-expense.test.ts`; `F4.AC2 blank-description copy matches the approved text` in `tests/domain/expense-messages.test.ts` | T2, T5, T7 |
| F4.AC3 | `F4.AC3 accepts 100 characters and refuses 101`, `F4.AC3 counts after trimming` and `F4.AC3 counts characters by code point` in `tests/domain/expense-description.test.ts`; `F4.AC3 writes nothing for a description over 100 characters` in `tests/services/add-expense.test.ts`; `F4.AC3 length copy matches the approved text` in `tests/domain/expense-messages.test.ts` | T2, T5, T7 |
| F4.AC4 | `F4.AC4 removes leading and trailing spaces` and `F4.AC4 keeps spaces inside the description` in `tests/domain/expense-description.test.ts`; `F4.AC4 saves the trimmed description` in `tests/services/add-expense.test.ts` | T2, T7 |
| F4.AC5 | `F4.AC5 refuses zero, 0.00 and a negative amount` and `F4.AC5 refuses text that is not a number` in `tests/domain/money.test.ts`; `F4.AC5 writes nothing for an amount of zero` in `tests/services/add-expense.test.ts`; `F4.AC5 zero-amount copy matches the approved text` in `tests/domain/expense-messages.test.ts` | T1, T5, T7 |
| F4.AC6 | `F4.AC6 refuses three digits after the decimal point and does not round` in `tests/domain/money.test.ts`; `F4.AC6 writes nothing for three decimal places` in `tests/services/add-expense.test.ts`; `F4.AC6 decimal-places copy matches the approved text` in `tests/domain/expense-messages.test.ts` | T1, T5, T7 |
| F4.AC7 | `F4.AC7 refuses an amount above 1,000,000.00`, `F4.AC7 accepts exactly 1,000,000.00` and `F4.AC7 formats 100000000 cents as 1,000,000.00` in `tests/domain/money.test.ts`; `F4.AC7 writes nothing above 1,000,000.00` in `tests/services/add-expense.test.ts`; `F4.AC7 maximum-amount copy matches the approved text` in `tests/domain/expense-messages.test.ts` | T1, T5, T7 |
| F4.AC8 | `F4.AC8 the form opens with no payer selected` in `tests/domain/expense-view.test.ts`; `F4.AC8 refuses a missing payer and writes nothing` in `tests/services/add-expense.test.ts`; `F4.AC8 payer copy matches the approved text` in `tests/domain/expense-messages.test.ts` | T4, T7, T5 |
| F4.AC9 | `F4.AC9 the form opens with every person ticked` in `tests/domain/expense-view.test.ts`; `F4.AC9 refuses an empty participant list and writes nothing` in `tests/services/add-expense.test.ts`; `F4.AC9 participant copy matches the approved text` in `tests/domain/expense-messages.test.ts` | T4, T7, T5 |
| F4.AC10 | `F4.AC10 saves an expense whose payer is not a participant` in `tests/services/add-expense.test.ts` | T7 |
| F4.AC11 | `F4.AC11 splits 10.00 among three as 3.34, 3.33, 3.33`, `F4.AC11 the shares add up to the amount in every case` in `tests/domain/split.test.ts`; `F4.AC11 formats 1000 cents as 10.00` in `tests/domain/money.test.ts`; `F4.AC11 stores the shares 3.34, 3.33 and 3.33 for 10.00` in `tests/services/add-expense.test.ts` | T1, T3, T7 |
| F4.AC12 | `F4.AC12 splits 90.00 among three as 30.00 each` in `tests/domain/split.test.ts` | T3 |
| F4.AC13 | `F4.AC13 gives the leftover cent to the earliest-added participant` and `F4.AC13 throws for an empty participant list` in `tests/domain/split.test.ts` | T3 |
| F4.AC14 | `F4.AC14 saves two expenses with the same description` in `tests/services/add-expense.test.ts` | T7 |
| F4.AC15 | `F4.AC15 sorts newest first`, `F4.AC15 on equal times the later save is listed first` and `F4.AC15 a loaded list gives the loaded state` in `tests/domain/expense-view.test.ts`; `F4.AC15 returns only this trip's expenses with payer names`, `F4.AC15 returns them newest first` and `F4.AC15 a failed store read gives an internal error and no expenses` in `tests/services/list-expenses.test.ts`; `F4.AC15 section headings and empty and loading copy match the approved text` in `tests/domain/expense-messages.test.ts`. The row layout (description, amount, payer, date): code review (T13) | T4, T8, T5, T13 |
| F4.AC16 | `F4.AC16 cancel does not call delete` in `tests/domain/expense-view.test.ts`. Cancel and Escape in the dialog, and the list staying unchanged: code review (T13) | T4, T13 |
| F4.AC17 | `F4.AC17 removes the expense` and `F4.AC17 a second delete of the same expense gives not_found` in `tests/services/delete-expense.test.ts`; `F4.AC17 confirm calls delete` in `tests/domain/expense-view.test.ts`; `F4.AC17 delete dialog and failure copy match the approved text` in `tests/domain/expense-messages.test.ts` | T4, T5, T8 |
| F4.AC18 | `F4.AC18 refuses a payer who is not on this trip and writes nothing`, `F4.AC18 refuses a participant who is not on this trip and writes nothing` and `F4.AC18 refuses a person id that does not exist and writes nothing` in `tests/services/add-expense.test.ts`; `F4.AC18 reload copy matches the approved text` in `tests/domain/expense-messages.test.ts`. The database-level check inside the transaction: code review (T10) | T5, T7, T10 |
| F4.AC19 | `F4.AC19 reports a payer as in use`, `F4.AC19 reports a participant as in use`, `F4.AC19 reports a person in no expense as not in use` and `F4.AC19 removing a payer is refused and the person stays` in `tests/services/person-usage.test.ts`. The foreign key with no cascade on payer and participant: code review (T9) | T11 |
| F4.AC20 | `F4.AC20 a trip with no people and no expenses gives the no-people empty state` and `F4.AC20 Add expense is not offered when the trip has no people` in `tests/domain/expense-view.test.ts`; `F4.AC20 empty copy for a trip with no people matches the approved text` in `tests/domain/expense-messages.test.ts` | T4, T5 |
| F4.AC21 | `F4.AC21 refuses a request with no session and writes nothing` and `F4.AC21 a trip owned by another user gives not_found and writes nothing` in `tests/services/add-expense.test.ts`; `F4.AC21 refuses a request with no session and reads nothing` and `F4.AC21 another user's trip gives not_found and no expenses` in `tests/services/list-expenses.test.ts`; `F4.AC21 refuses a request with no session and deletes nothing` and `F4.AC21 another user's expense gives not_found and nothing is deleted` in `tests/services/delete-expense.test.ts`. Every query filters on the owner through `trips`: code review (T10) | T7, T8, T10 |
| F4.AC22 | Code review: the trip delete removes `expenses` through `trip_id ON DELETE CASCADE`, and their `expense_participants` through the expense cascade (T9). F2.AC10 covers the trip delete itself. A unit test can only check that the delete service calls the store once | T9 |
| F4.AC23 | `F4.AC23 skips a person who is not a participant: 0.05 gives Alex 0.03 and Jo 0.02` in `tests/domain/split.test.ts` | T3 |
| F4.AC24 | `F4.AC24 refuses an amount containing a comma` in `tests/domain/money.test.ts`; `F4.AC24 writes nothing for an amount with a comma` in `tests/services/add-expense.test.ts`; `F4.AC24 comma copy matches the approved text` in `tests/domain/expense-messages.test.ts` | T1, T5, T7 |
| F4.AC25 | `F4.AC25 accepts "10", "10.5" and "10.50" as 1000, 1050 and 1050 cents` in `tests/domain/money.test.ts` | T1 |
| F4.AC26 | `F4.AC26 refuses ".5" and "10."` in `tests/domain/money.test.ts`; `F4.AC26 partial amounts use the zero-amount copy` in `tests/domain/expense-messages.test.ts` | T1, T5 |
| F4.AC27 | `F4.AC27 a failed list request gives the failed state` in `tests/domain/expense-view.test.ts`; `F4.AC27 a failed list read gives internal and no expenses for the failed state` in `tests/services/list-expenses.test.ts`; `F4.AC27 failed-load copy and Try again label match the approved text` in `tests/domain/expense-messages.test.ts`. The Try again button fetching the list again, and the rest of the page staying shown: code review (T13). After Try again, the loaded list is the one tested under F4.AC15 | T4, T5, T8, T13 |

Double submit on add (Edge cases): code review of the disabled Save button (T14). No unit test, as the spec's Test plan says.

## Sent back to spec
None. The re-approved spec adds F4.AC27 (failed load, with the approved copy and "Try again" button). It is mapped in the table above and covered by T4, T5, T8 and T13.

## Decisions log
- 2026-11-19: Amount is sent as a string of digits in the request (`"10.50"`), and a JSON number is refused with `invalid_amount` → a JSON number is a float before the server sees it, which CLAUDE.md forbids for money.
- 2026-11-19: Amount rules run in a fixed order: non-string, comma, pattern, decimal places, zero, maximum. The first failure wins → the spec gives each refusal its own copy but does not say which wins when two apply (for example "1,000.000"). This order gives the comma message first, as the spec's comma rule is the most specific.
- 2026-11-19: The amount is not trimmed, so a space in the amount is refused as "not a number" → F4.R2 says no characters other than digits and one decimal point are accepted. Trimming would be a product change.
- 2026-11-19: Cents are built from the digit string and converted with `BigInt` → no float is used anywhere in the amount path.
- 2026-11-19: `formatCents` adds thousands separators ("1,000,000.00") → the approved copy for the maximum uses that form.
- 2026-11-19: Shares are computed once at save time and stored in `expense_participants.share_cents` → F5 and F6 read the exact amounts that were saved, and the rule is applied in one place (`splitEqually`).
- 2026-11-19: Trip order for leftover cents is the order of F3's `PersonStore.listByTrip` (by `position`) → matches F3.R6 and product.md R3 without a second ordering rule.
- 2026-11-19: Duplicate participant ids are removed before the split → a repeated id must not give one person two shares.
- 2026-11-19: Expense order uses a per-trip `position` (max + 1, set inside the add transaction), with `created_at` first and `position` as the tie-break → same reason as F3's `position`: two saves in the same millisecond must keep their order (F4.R7).
- 2026-11-19: Payer and participant trip membership is checked twice: in `addExpense` through F3's `PersonStore` (unit-tested with fakes), and in the store's transaction (code review). The second check closes the race with a removal → F4.R12 must hold even under concurrent requests.
- 2026-11-19: No composite foreign key `(person_id, trip_id)` → it would change F3's approved `people` table. The transactional check covers it, and the rule is listed in the code review items.
- 2026-11-19: `person_not_on_trip` returns `400`, not `404` or `409` → the request is malformed for this trip, and the approved copy tells the user to reload. The status is a technical choice.
- 2026-11-19: The usage check is `ExpenseUsage` (Drizzle `createExpenseUsage`) composed by `makePersonUsage` in `src/services/` → F3's stub lived in `src/db/` and could not be unit-tested. Moving the composition to `services/` keeps the F4.AC19 test with a fake, and F6 adds its payment check to the same composition.
- 2026-11-19: F3's `src/db/person-usage.ts` is deleted and its `createPersonUsage()` is replaced in `deps.ts` → F3's plan said F4 would add the expense check to that file. The file now holds the Drizzle usage store under a new name, and the F3 stub's answer ("nobody is in use") no longer applies once expenses exist.
- 2026-11-19: `expense_participants.person_id` and `expenses.payer_id` use `ON DELETE NO ACTION`, not `RESTRICT` (see the entry below) → F3.R9 and F3's plan require the database to refuse removal of a referenced person.
- 2026-11-19: `expense_participants.expense_id` and `expenses.trip_id` cascade → F4.R11 and F2.R9, and deleting an expense removes its participant rows.
- 2026-11-19: `formatTripDate` is imported from F2's `trip-view.ts` for the expense date → the spec says the date format is the same as F2.R7. Moving it to a shared file would change an approved F2 file, so this is left for a later refactor.
- 2026-11-19: The expense list's `payerName` comes from F3's `PersonStore` in the list service → the expense table holds only the payer's id, and the person's name stays in one place.
- 2026-11-19: Logs record ids, trip id and owner id only; never the description, amount or names → project-rules.md forbids logging personal data and CLAUDE.md asks for the same.
- 2026-11-19: Plan saved as Draft → the user has not approved it. Approval waits for the user's explicit yes.
- 2026-11-19: Re-plan after the spec re-approval (F4.AC27 added) → the failed-load state uses the approved copy and "Try again" button, with tests in T4, T5 and T8 and a code-review item in T13. The spec now has 27 ACs, the map covers 27 of 27, and the Sent back to spec item is cleared.
- 2026-11-19: Foreign keys from `expenses.payer_id` and `expense_participants.person_id` to `people(id)` use `ON DELETE NO ACTION`, never `RESTRICT` → SQLite checks `RESTRICT` immediately but checks `NO ACTION` at the end of the statement. A trip delete removes its people and expenses in one statement, so `RESTRICT` would fail the trip delete (F2.R9, F4.R11). `NO ACTION` still refuses a delete of a person who is in an expense (F3.R9, F4.R13). T9's Done when checks both cases.
- 2026-11-19: Approve F4 plan? → Yes. Status set to Approved after the user's explicit approval. The plan covers all 27 ACs in the re-approved spec.
