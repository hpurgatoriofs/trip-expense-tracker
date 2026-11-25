# F6 — Settle up · Plan

_Status: Approved · Last updated: 2026-11-19 · Spec: [F6-settle-up.md](../specs/features/F6-settle-up.md) (Approved 2026-11-19)_

## Approach
F6 stores one new thing, the payment record, and adds no other stored value. Suggested payments are calculated each time they are requested (F6.R3), from the balances that F5 already computes. The rule that turns balances into suggestions (R6, with ties broken by the order people were added) lives in `src/domain/settle-up.ts` as pure functions. They take the balances as plain arguments, so the worked examples and the zero-sum case are unit-tested without a database. Balances come from F5's `computeBalances`, which already counts payments (F5.R12), so F6 does not repeat the balance formula. The row text, the section states and the copy live in `settle-up-view.ts` and `settle-up-messages.ts`. Amounts are shown with F4's `formatCents`, and dates with F2's `formatTripDate`.

Recording a payment is the one write that needs care. The service first checks the request's shape (F6.R6). It then calls `PaymentStore.recordIfCurrent`, which runs in one immediate SQLite transaction: it reads the trip's people, expenses and payments, asks the pure check whether the suggestion is still current (F6.R7), and inserts the row only if it is. The check and the insert are in the same transaction, so two tabs cannot both record the same suggestion. The transaction callback is synchronous, as `better-sqlite3` requires. Deleting a payment is one ownership-checked delete. Every service calls `requireUser` first (F1.R10, F6.R14), and the owner comes only from the session.

The payment check joins F4's expense check in the removal rule (F3.R9, F3.AC11). `makePersonUsage` takes both usage ports, so the composition stays in `src/services/` and is unit-tested with fakes. Payment rows reference people with a composite foreign key on `(trip_id, payer_id)` and `(trip_id, payee_id)`, so the database also refuses a payment that names a person from another trip. The unique key on `people(trip_id, id)` that this needs is added by F3's plan (F3.T6), so F6 changes no table that F3 creates. The Settle up section is a client component below Balances. It refetches when the trip page's `version` counter changes, and it bumps that counter after each payment change, so Balances and the suggestions update together (F6.R8).

**Build dependency:** F5 must be built first (F5.T1–T7). F5 is build step 5, and F6 is build step 6. F6 has no setup task of its own; the scaffold is F1.T1, as in F2–F5.

## Data model changes
Migration needed (see F6.T7, which needs human approval).

**`payments`** (new)

| Column | Type | Constraints |
|---|---|---|
| `id` | TEXT | PRIMARY KEY (UUID from `newId`) |
| `trip_id` | TEXT | NOT NULL, REFERENCES `trips(id)` ON DELETE CASCADE (F2.R9) |
| `payer_id` | TEXT | NOT NULL |
| `payee_id` | TEXT | NOT NULL |
| `position` | INTEGER | NOT NULL, UNIQUE with `trip_id`; order within the trip (F6.R9, F4.R7 tie-break) |
| `amount_cents` | INTEGER | NOT NULL, CHECK (`amount_cents > 0`) (F6.R6) |
| `created_at` | TEXT | NOT NULL (ISO 8601, UTC) (F6.R9) |

Table constraints:
- `CHECK (payer_id <> payee_id)` (F6.R6)
- `FOREIGN KEY (trip_id, payer_id) REFERENCES people(trip_id, id) ON DELETE NO ACTION`, and the same for `(trip_id, payee_id)`. These are not `RESTRICT` and not `CASCADE`, for the reason in the F4 plan: a trip delete removes its people and payments in one statement, and `NO ACTION` is checked only at the end of it (F2.R9). With `NO ACTION`, the database refuses to delete a person who is in a payment (F3.R9, F3.AC11).
- Indexes: `payments(payer_id)` and `payments(payee_id)` for the usage check. `UNIQUE (trip_id, position)` covers the list query.

**`people`** (not changed by F6): F3's table already has `UNIQUE (trip_id, id)` (F3.T6), which the composite foreign keys above reference. F6 adds no column or key to it.

Suggested payments are not stored (F6.R3).

## Routes and API
All under `/api/trips/[id]/`. Every request requires a logged-in session. A logged-out request gets `401` `not_logged_in`. A trip owned by someone else and a missing trip return the same `404` `not_found` body (F1.R10, F2.R8). Errors use F1's shape `{ "error": { "code": string } }`. Money is sent as whole cents (`amountCents`), never as text or float (CLAUDE.md › Money).

| Method and path | Request | Success | Errors |
|---|---|---|---|
| `GET /api/trips/[id]/settle-up` | none | `200 { "suggestions": [{ "payerId", "payerName", "payeeId", "payeeName", "amountCents" }], "payments": [{ "id", "payerId", "payerName", "payeeId", "payeeName", "amountCents", "createdAt" }] }`. Suggestions are in the order matched (F6.R2). Payments are newest first (F6.R9). `createdAt` is ISO 8601 UTC | `401` `not_logged_in`; `404` `not_found`; `500` `internal` |
| `POST /api/trips/[id]/payments` | `{ "payerId", "payeeId", "amountCents" }`, the values of one suggestion | `201 { "payment": { same shape as a payments row } }` | `400` `invalid_body` (not JSON); `400` `invalid_payment` (payer equals payee, or amount not a whole number above zero, F6.R6); `401` `not_logged_in`; `404` `not_found`; `409` `payment_changed` (no current suggestion matches, F6.R7); `500` `internal` |
| `DELETE /api/trips/[id]/payments/[paymentId]` | none | `204` no body | `401` `not_logged_in`; `404` `not_found` (also for a payment another tab already deleted, F6.R10); `500` `internal` |

The API sends names and not display text. The client builds the row text with `settle-up-view.ts`.

## Screens
- **Settle up section** (on `/trips/[id]`, below the Balances section from F5). Client component. Heading "Settle up", at the same level as Balances.
  - Loading: "Loading…".
  - Failed: "We couldn't load settle up. Try again." The rest of the trip page keeps working. No retry button, as in F5.
  - Loaded: the note "Money moves outside the app. Mark a payment as paid once it's done." (always shown when loaded, which covers F6.AC16). Then one row per suggestion, reading "[Payer] pays [Payee] [amount]" with a "Mark as paid" button. When there are no suggestions: "Everyone is settled up." and no suggestion rows. Then the payments list: one row per payment, reading "[Payer] paid [Payee] [amount]", the date recorded, and a Delete button. With no payments: "No payments yet."
  - Mark as paid, in flight: that button reads "Saving…" and is disabled until the request ends.
  - Mark as paid refused (409): nothing is recorded, the section refetches, and "This payment has changed. Refresh to see the latest." is shown.
  - Delete dialog: "Delete this payment?", body "[Payer] paid [Payee] [amount] will be removed and the balances will update.", buttons "Delete payment" (shows "Deleting…" while running) and "Cancel".
  - Each suggestion and payment row is one text unit. Each button has the accessible name in the Accessibility section.

## Files changed
Paths are under `app/`. Source files only; test files are listed in each task.

| Path | New or changed | Why |
|---|---|---|
| `src/domain/settle-up.ts` | New | Suggestion rule R6, current-suggestion check, payment request check (T1) |
| `src/domain/settle-up-view.ts` | New | Row text, dialog text, section state (T2) |
| `src/domain/settle-up-messages.ts` | New | Approved copy from the spec's States & errors (T2) |
| `src/ports/payment-store.ts` | New | `PaymentStore`, which extends F5's `PaymentReader` with the write methods (T3) |
| `src/ports/payment-usage.ts` | New | `PaymentUsage` port: "is this person in a payment?" (T3) |
| `tests/fakes/in-memory-payment-store.ts` | New | Fake store that also implements `PaymentUsage` (T3) |
| `src/services/get-settle-up.ts` | New | Suggestions and payments for a trip (T4) |
| `src/services/record-payment.ts` | New | Records a suggested payment, with the re-check in one transaction through the port (T5) |
| `src/services/delete-payment.ts` | New | Deletes one payment of a trip (T5) |
| `src/services/person-usage.ts` | Changed | Adds the payment check to F4's composition (T6) |
| `src/db/schema.ts` | Changed | `payments` table (T7) |
| `src/db/payment-store.ts` | New | `PaymentStore` on Drizzle: owner checks, immediate transaction for the re-check and insert (T8) |
| `src/db/payment-usage.ts` | New | `PaymentUsage` on Drizzle (T8) |
| `src/lib/deps.ts` | Changed | Replaces F5's payment stub and composes both usage checks (T9) |
| `src/db/payment-reader.ts` | Deleted | F5's stub reader, replaced by the real store (T9) |
| `src/app/api/trips/[id]/settle-up/route.ts` | New | Thin GET handler (T10) |
| `src/app/api/trips/[id]/payments/route.ts` | New | Thin POST handler (T10) |
| `src/app/api/trips/[id]/payments/[paymentId]/route.ts` | New | Thin DELETE handler (T10) |
| `src/app/(app)/trips/[id]/delete-payment-dialog.tsx` | New | Delete confirm dialog for a payment (T11) |
| `src/app/(app)/trips/[id]/settle-up-section.tsx` | New | Settle up section and its states (T12) |
| `src/app/(app)/trips/[id]/trip-page.tsx` | Changed | Renders the section below Balances and passes `version` and `onChanged` (T13) |

## Tasks

### F6.T1 — Suggested payments and payment rules
- **Files:** `app/src/domain/settle-up.ts`, `app/tests/domain/settle-up.test.ts`
- **Depends on:** F5.T2 (`computeBalances`), F1.T1
- **Work:**
  - `suggestPayments(balances: readonly { id: string; balanceCents: number }[])` returns `{ payerId, payeeId, amountCents }[]`, in the order matched (F6.R1, F6.R2). Each step: the payer is the most negative balance, and the payee is the most positive balance. On a tie, the entry earlier in `balances` (added first) is chosen. The amount is the smaller of the two absolute values. Both balances are reduced by that amount. Steps repeat until every balance is zero. The function throws an `Error` if the balances do not sum to exactly zero (R5). Integers only.
  - `isCurrentSuggestion(suggestions, candidate)` returns true when one suggestion has the same payer, payee and amount (F6.R7).
  - `validatePaymentRequest(input)` returns `{ ok: true }` or `{ ok: false, error: "invalid_payment" }`. The payer and payee ids are non-empty and different. The amount is an integer that is safe for JavaScript and greater than zero (F6.R6).
- **Tests:** `tests/domain/settle-up.test.ts`: `F6.AC1 worked example 1 suggests Jo pays Sam 40.00 then Alex pays Sam 10.00`; `F6.AC2 two equal debtors are matched in the order added`; `F6.AC3 after Jo pays Sam 40.00 the only suggestion is Alex pays Sam 10.00`; `F6.AC4 after the 40.00 payment Sam is owed 10.00, Alex owes 10.00 and Jo is settled`; `F6.AC5 applying every suggestion leaves every balance at zero`; `F6.AC5 worked example 2 rounding case ends with zero balances`; `F6.AC6 an amount that differs from the suggestion is not current`; `F6.AC7 payer equal to payee is refused`; `F6.AC7 zero and negative amounts are refused`; `F6.AC11 no expenses gives no suggestions`.
- **Done when:** `npm test` passes the file. Each worked-example number matches product.md.

### F6.T2 — Settle-up view rules and copy
- **Files:** `app/src/domain/settle-up-view.ts`, `app/src/domain/settle-up-messages.ts`, `app/tests/domain/settle-up-view.test.ts`, `app/tests/domain/settle-up-messages.test.ts`
- **Depends on:** F6.T1, F4.T1 (`formatCents`), F2.T2 (`formatTripDate`)
- **Work:**
  - `suggestionRow({ payerName, payeeName, amountCents })` returns `{ text, buttonLabel, buttonName }`. `text` is "[Payer] pays [Payee] [amount]". `buttonLabel` is "Mark as paid". `buttonName` is "Mark [Payer] pays [Payee] [amount] as paid".
  - `paymentRow({ payerName, payeeName, amountCents, createdAt })` returns `{ text, dateLabel }`. `text` is "[Payer] paid [Payee] [amount]". `dateLabel` is `formatTripDate(createdAt)`.
  - `deleteDialogText({ payerName, payeeName, amountCents })` returns the title, body, and button labels from the spec.
  - `settleUpSectionState(request)` takes `"loading"`, `"failed"`, or `{ status: "loaded", suggestions, payments }`. It returns `"loading"`, `"failed"`, or a loaded view with the note (always present), the suggestion rows, `settledCopy` set to "Everyone is settled up." when there are no suggestions, and `emptyPaymentsCopy` set to "No payments yet." when there are no payments.
  - `settle-up-messages.ts` exports the approved copy word for word: heading "Settle up"; the note "Money moves outside the app. Mark a payment as paid once it's done."; "Loading…"; "We couldn't load settle up. Try again."; "Everyone is settled up."; "No payments yet."; "This payment has changed. Refresh to see the latest."; the dialog title, body template, "Delete payment", "Cancel"; "Saving…"; "Deleting…".
- **Tests:** `tests/domain/settle-up-view.test.ts`: `F6.AC4 a payment row reads "Jo paid Sam 40.00"`; `F6.AC14 a payment recorded on 18 Nov 2026 shows that date`; `F6.AC15 a suggestion row reads "Jo pays Sam 40.00" with the Mark as paid label`; `F6.AC4 the button name is "Mark Jo pays Sam 40.00 as paid"`; `F6.AC5 no suggestions gives Everyone is settled up. with the payments still listed`; `F6.AC11 no suggestions and no payments give the settled copy and the empty payments copy`; `F6.AC16 a loaded section always carries the note`; `F6.AC8 the delete dialog body names the payment`; `F6.AC16 the loading and failed states give their approved copy`. `tests/domain/settle-up-messages.test.ts`: `F6.AC16 note text matches the approved copy`; `F6.AC6 refusal message matches the approved copy`; `F6.AC11 settled and empty-payments copy match the approved text`.
- **Done when:** `npm test` passes both files.

### F6.T3 — Payment store and usage ports, and fake
- **Files:** `app/src/ports/payment-store.ts`, `app/src/ports/payment-usage.ts`, `app/tests/fakes/in-memory-payment-store.ts`
- **Depends on:** F5.T4 (`PaymentReader`, `PaymentRecord`), F5.T2 (`computeBalances` input types), F3.T3 (fakes convention), F4.T6, F1.T5
- **Work:**
  - `NewPayment = { id, payerId, payeeId, amountCents, createdAt: Date }`.
  - `PaymentStore extends PaymentReader`, with these methods, each taking `ownerId`:
    - `listByTrip` (inherited from F5). Contract: returns the trip's payments newest first, by `position` descending. `null` when the trip is missing or not owned.
    - `recordIfCurrent(ownerId, tripId, payment: NewPayment, isCurrent: (state: BalanceInput) => boolean): Promise<{ ok: true, payment: PaymentRecord } | { ok: false, reason: "not_found" | "payment_changed" }>`. The adapter reads the trip's people (in order added), expenses (with participants) and payments, builds the `BalanceInput`, and calls `isCurrent`. The insert happens only when that returns true.
    - `deleteForOwner(ownerId, tripId, paymentId): Promise<{ ok: true } | { ok: false, reason: "not_found" }>`.
  - `PaymentUsage`: `isPersonInPayment(personId): Promise<boolean>`, true when the person is the payer or payee of any payment.
  - `InMemoryPaymentStore` takes `trips: { id, ownerId }[]`, `people: { id, tripId }[]` and a function `readExpenses(tripId)` that gives the expenses the test set up. It keeps payments in a Map, assigns positions, builds the `BalanceInput` from the people, expenses and its own payments (so a recorded payment changes the next check, as in the database), enforces owner and trip checks the same way the store does, and exposes `records`, `writeCount`, `listCalls`, `deleteCalls`, and `checkCalls`. It implements `PaymentUsage` too.
- **Tests:** None. These are interfaces and a test helper, exercised by F6.T4–T6.
- **Done when:** `npm run build` type-checks with the files present.

### F6.T4 — Get-settle-up service
- **Files:** `app/src/services/get-settle-up.ts`, `app/tests/services/get-settle-up.test.ts`
- **Depends on:** F6.T1, F6.T3, F5.T2 (`computeBalances`), F3.T2 (`sortOldestFirst`), F3.T3, F4.T6, F4.T8 (`deleteExpense`, used in one test), F1.T15 (`requireUser`), F1.T5
- **Work:** `getSettleUp({ session, people, expenses, payments, now, logger }, { tripId })`:
  1. Call `requireUser({ session, now })` first. A refusal returns `not_logged_in` with no store call.
  2. Call `people.listByTrip(userId, tripId)`. `null` returns `not_found`. Sort with `sortOldestFirst`.
  3. Call `expenses.listByTrip` and `payments.listByTrip`. A `null` from either returns `not_found`.
  4. Map the inputs to `BalanceInput` (stored shares, no recalculation). Call `computeBalances`, then `suggestPayments`.
  5. Attach names from the person records. Return `{ ok: true, suggestions, payments }`, with payments in the order the store returns them.

  If a store or a calculation throws, return `{ ok: false, error: "internal" }` with no data. Log the trip id only, never a name or an amount.
- **Tests:** `tests/services/get-settle-up.test.ts`: `F6.AC12 refuses a request with no session and reads nothing`; `F6.AC12 another owner's trip gives not_found and no data`; `F6.AC1 lists Jo pays Sam 40.00 and Alex pays Sam 10.00 for worked example 1`; `F6.AC3 after a recorded Jo to Sam payment the only suggestion is Alex pays Sam 10.00`; `F6.AC5 once every suggestion is recorded no suggestions remain`; `F6.AC10 payments are listed newest first`; `F6.AC11 a trip with no expenses has no suggestions`; `F6.AC13 a payment that now exceeds the debt stays listed, the expense delete is not blocked, and the suggestions show the new direction`.
- **Done when:** `npm test` passes the file.

### F6.T5 — Record-payment and delete-payment services
- **Files:** `app/src/services/record-payment.ts`, `app/src/services/delete-payment.ts`, `app/tests/services/record-payment.test.ts`, `app/tests/services/delete-payment.test.ts`
- **Depends on:** F6.T1, F6.T3, F1.T15 (`requireUser`), F1.T5
- **Work:**
  - `recordPayment({ session, payments, newId, now, logger }, { tripId, payerId, payeeId, amountCents })`:
    1. `requireUser` first. A refusal returns `not_logged_in` with no store call.
    2. `validatePaymentRequest`. A failure returns `invalid_payment` with no store call.
    3. Call `payments.recordIfCurrent(userId, tripId, { id: newId(), payerId, payeeId, amountCents, createdAt: now }, (state) => isCurrentSuggestion(suggestPayments(computeBalances(state)), { payerId, payeeId, amountCents }))`.
    4. Map `not_found` to `not_found` and `payment_changed` to `payment_changed`. On success, return `{ ok: true, payment }` and log `{ tripId, paymentId, ownerId }` with "payment recorded".

    A throw returns `internal`. There is no confirm argument: the service records at once (F6.R16).
  - `deletePayment({ session, payments, now, logger }, { tripId, paymentId })`: `requireUser` first. Then `payments.deleteForOwner(userId, tripId, paymentId)`. `not_found` passes through. On success, log `{ tripId, paymentId, ownerId }` with "payment deleted".
- **Tests:** `tests/services/record-payment.test.ts`: `F6.AC4 recording a matching suggestion stores its payer, payee and amount`; `F6.AC15 a suggestion is recorded in one call with no confirm step`; `F6.AC6 the same suggestion sent again is refused and no second payment is recorded`; `F6.AC6 an amount that is no longer a suggestion is refused and nothing is recorded`; `F6.AC7 payer equal to payee is refused and nothing is recorded`; `F6.AC7 a zero or negative amount is refused and nothing is recorded`; `F6.AC12 refuses a request with no session and writes nothing`; `F6.AC12 another owner's trip gives not_found and writes nothing`. `tests/services/delete-payment.test.ts`: `F6.AC8 a confirmed delete removes the payment from the store`; `F6.AC8 a payment already deleted in another tab gives not_found`; `F6.AC12 refuses a request with no session and deletes nothing`; `F6.AC12 another owner's trip gives not_found and deletes nothing`.
- **Done when:** `npm test` passes both files.

### F6.T6 — Payment check in the removal rule
- **Files:** `app/src/services/person-usage.ts` (changed), `app/tests/services/person-usage.test.ts` (changed)
- **Depends on:** F6.T3, F4.T11
- **Work:** `makePersonUsage({ expenses, payments }: { expenses: ExpenseUsage; payments: PaymentUsage }): PersonUsage` returns `isInUse(personId)` as `expenses.isPersonInExpense(personId) || payments.isPersonInPayment(personId)`. It replaces F4's one-argument version. The file imports only ports, so the test uses fakes. This implements F6.R15, which the spec has no AC for. Its tests carry F3.AC11, the AC that states the rule.
- **Tests:** `tests/services/person-usage.test.ts` (F4's tests keep their names and get the payments fake passed in): `F3.AC11 reports a payer of a payment as in use`; `F3.AC11 reports a payee of a payment as in use`; `F3.AC9 reports a person in no expense or payment as not in use`; `F3.AC11 removing a payee is refused and the person stays` (runs F3's `removePerson` with this check and the fake store).
- **Done when:** `npm test` passes the file.

### F6.T7 — Payments table migration
- **Files:** `app/src/db/schema.ts` (changed), `app/drizzle/` (generated migration)
- **Depends on:** F2.T7 (`trips`), F3.T6 (`people`, including its `UNIQUE (trip_id, id)` key, which F6's foreign keys reference), F4.T9 (`expenses`, to keep the schema file's order)
- **Work:** Add the `payments` table and its constraints from Data model changes. Do not change the `people` table. Generate the migration with `npm run db:generate`. Check the generated SQL before it is applied: it creates `payments` and does not alter or rebuild `people`.
- **Tests:** None. Constraints and cascades are checked in code review (CLAUDE.md › Folder layout).
- **Done when:** `npm run db:generate` produces one migration. The SQL creates the payments table with its CHECKs and its composite foreign keys with `NO ACTION`, and does not touch `people`. `npm run db:migrate` runs on an empty database.
- **Needs human approval:** yes — database migration (project-rules › Working with AI).

### F6.T8 — Drizzle payment store and payment usage
- **Files:** `app/src/db/payment-store.ts`, `app/src/db/payment-usage.ts`
- **Depends on:** F6.T3, F6.T7, F2.T8 (owner check pattern), F4.T10 (participant read pattern)
- **Work:**
  - `createPaymentStore(db)` returns a `PaymentStore`. Every query uses Drizzle's parameterised builders.
    - `listByTrip` checks `trips.id = ? AND owner_id = ?` first. If there is no match, it returns `null`. Otherwise it selects the trip's payments ordered by `position` descending.
    - `recordIfCurrent` runs `db.transaction(cb, { behavior: "immediate" })`. Inside it: the owner check (`null` becomes `not_found`); the people ordered by position; the expenses with their participants; the payments. It builds the `BalanceInput` and calls `isCurrent`. If that is false, it returns `payment_changed`. Otherwise it inserts with `position` = the trip's maximum position + 1. The callback must not `await`.
    - `deleteForOwner` checks the trip owner, then deletes `where id = ? AND trip_id = ?`. If no row is deleted, it returns `not_found`.
  - `createPaymentUsage(db)` returns a `PaymentUsage`. `isPersonInPayment` is true when `payments.payer_id = ?` or `payments.payee_id = ?` matches a row.
- **Tests:** None in this task. Code review checks: every query is parameterised and owner-filtered; the state read and the insert are in one immediate transaction with no `await` inside it; `createPaymentUsage` builds no SQL from strings.
- **Done when:** `npm run build` type-checks. Code review passes the three checks above.

### F6.T9 — Dependency wiring
- **Files:** `app/src/lib/deps.ts` (changed), `app/src/db/payment-reader.ts` (deleted)
- **Depends on:** F6.T6, F6.T8, F5.T6 (the stub reader), F4.T12 (`deps.ts` as changed by F4)
- **Work:** `deps.ts` builds `createPaymentStore(db)` in place of F5's stub reader. It builds `personUsage = makePersonUsage({ expenses: createExpenseUsage(db), payments: createPaymentUsage(db) })`. Delete `src/db/payment-reader.ts` (F5's stub), which nothing imports after this.
- **Tests:** None. Code review checks that the removal check now reads both usage stores.
- **Done when:** `npm run build` passes, and nothing imports `src/db/payment-reader.ts`.

### F6.T10 — Settle-up and payment routes
- **Files:** `app/src/app/api/trips/[id]/settle-up/route.ts`, `app/src/app/api/trips/[id]/payments/route.ts`, `app/src/app/api/trips/[id]/payments/[paymentId]/route.ts`
- **Depends on:** F6.T4, F6.T5, F6.T9, F2.T9 (route pattern)
- **Work:** The handlers read `id` and `paymentId` from the URL and call the service with the session, `now`, `newId` and the logger. `GET` maps to 200 with the shape in Routes and API. `POST` parses the JSON body (`400 invalid_body` if it is not JSON), passes `payerId`, `payeeId` and `amountCents` through unchanged, and returns `201`. `DELETE` returns `204`. Every error maps to the status in the table. The handlers never log bodies, names or amounts. The owner comes only from the session.
- **Tests:** None in this task. The logic is tested in F6.T4–T5. Code review checks the status mapping and that nothing sensitive is logged.
- **Done when:** with the dev server running, `curl` shows `401` when logged out; `404` for another user's trip; `201` for a suggested payment; `409` when the same payment is sent again; `204` on delete.

### F6.T11 — Delete payment dialog
- **Files:** `app/src/app/(app)/trips/[id]/delete-payment-dialog.tsx`
- **Depends on:** F6.T2, F4.T13 (`delete-expense-dialog.tsx` pattern)
- **Work:** Client dialog. Its title, body and buttons come from `deleteDialogText`. "Delete payment" shows "Deleting…" and is disabled while the request runs. It takes focus when it opens and closes on Escape. Cancel closes the dialog, returns focus to the Delete button it came from, and sends no request.
- **Tests:** None in this task. Copy is tested in F6.T2. Checked by hand or in review: Cancel changes nothing (F6.AC9); focus returns on Cancel; Escape closes.
- **Done when:** Delete on a payment opens the named dialog. Cancel leaves the list as it was. Confirm removes the row.

### F6.T12 — Settle-up section
- **Files:** `app/src/app/(app)/trips/[id]/settle-up-section.tsx`
- **Depends on:** F6.T2, F6.T10, F6.T11, F5.T7 (`version` counter pattern)
- **Work:** Client component with props `tripId`, `version` and `onChanged`. It fetches `GET /api/trips/[id]/settle-up` on mount and whenever `version` changes, and renders the states from `settleUpSectionState`. "Mark as paid" posts the suggestion's ids and amount. While the request runs, that row shows "Saving…" and is disabled. On success, it refetches and calls `onChanged`. A `409` shows the refusal copy and refetches. Delete opens T11's dialog. On confirm it sends `DELETE`. On success, or on a `404`, it refetches and calls `onChanged`. Any other failure shows the failed copy.
- **Tests:** None in this task. Checked by hand or in review: the button cannot send a second request while one is in flight (F6.R7); a row reads as one unit; the section works by keyboard.
- **Done when:** On the worked example 1 trip, "Mark as paid" on "Jo pays Sam 40.00" shows "Jo paid Sam 40.00" in the list. The suggestion "Alex pays Sam 10.00" remains. Balances update without a reload.

### F6.T13 — Trip page wiring
- **Files:** `app/src/app/(app)/trips/[id]/trip-page.tsx` (changed)
- **Depends on:** F6.T12, F5.T7
- **Work:** Render the settle-up section below the Balances section. Pass it the same `version` counter and `onChanged` callback that F5 uses for people and expenses, so a payment change refreshes Balances and the suggestions together (F6.R8).
- **Tests:** None in this task. Checked by hand: the sections appear in the order People, Expenses, Balances, Settle up. Adding or deleting an expense updates the suggestions. A failed settle-up load does not break the page.
- **Done when:** on a trip with Sam, Alex and Jo and the worked example 1 expenses, the Settle up section shows "Jo pays Sam 40.00" and "Alex pays Sam 10.00". Recording the first updates the second and the Balances section, with no reload.

## Acceptance criteria map
Spec ACs: 16 · Mapped: 16

| AC | Mapped to | Task |
|---|---|---|
| F6.AC1 | `F6.AC1 worked example 1 suggests Jo pays Sam 40.00 then Alex pays Sam 10.00` in `tests/domain/settle-up.test.ts`; `F6.AC1 lists Jo pays Sam 40.00 and Alex pays Sam 10.00 for worked example 1` in `tests/services/get-settle-up.test.ts` | T1, T4 |
| F6.AC2 | `F6.AC2 two equal debtors are matched in the order added` in `tests/domain/settle-up.test.ts` | T1 |
| F6.AC3 | `F6.AC3 after Jo pays Sam 40.00 the only suggestion is Alex pays Sam 10.00` in `tests/domain/settle-up.test.ts`; `F6.AC3 after a recorded Jo to Sam payment the only suggestion is Alex pays Sam 10.00` in `tests/services/get-settle-up.test.ts` | T1, T4 |
| F6.AC4 | `F6.AC4 after the 40.00 payment Sam is owed 10.00, Alex owes 10.00 and Jo is settled` in `tests/domain/settle-up.test.ts`; `F6.AC4 a payment row reads "Jo paid Sam 40.00"` in `tests/domain/settle-up-view.test.ts`; `F6.AC4 recording a matching suggestion stores its payer, payee and amount` in `tests/services/record-payment.test.ts` | T1, T2, T5 |
| F6.AC5 | `F6.AC5 applying every suggestion leaves every balance at zero`, `F6.AC5 worked example 2 rounding case ends with zero balances` in `tests/domain/settle-up.test.ts`; `F6.AC5 once every suggestion is recorded no suggestions remain` in `tests/services/get-settle-up.test.ts`; `F6.AC5 no suggestions gives Everyone is settled up. with the payments still listed` in `tests/domain/settle-up-view.test.ts` | T1, T2, T4 |
| F6.AC6 | `F6.AC6 the same suggestion sent again is refused and no second payment is recorded`, `F6.AC6 an amount that is no longer a suggestion is refused and nothing is recorded` in `tests/services/record-payment.test.ts`; `F6.AC6 an amount that differs from the suggestion is not current` in `tests/domain/settle-up.test.ts`; `F6.AC6 refusal message matches the approved copy` in `tests/domain/settle-up-messages.test.ts` | T1, T2, T5 |
| F6.AC7 | `F6.AC7 payer equal to payee is refused`, `F6.AC7 zero and negative amounts are refused` in `tests/domain/settle-up.test.ts`; `F6.AC7 payer equal to payee is refused and nothing is recorded`, `F6.AC7 a zero or negative amount is refused and nothing is recorded` in `tests/services/record-payment.test.ts` | T1, T5 |
| F6.AC8 | `F6.AC8 a confirmed delete removes the payment from the store`, `F6.AC8 a payment already deleted in another tab gives not_found` in `tests/services/delete-payment.test.ts`; `F6.AC8 the delete dialog body names the payment` in `tests/domain/settle-up-view.test.ts` | T2, T5 |
| F6.AC9 | Code review: Cancel only closes the dialog and sends no request. This is UI wiring, and a unit test cannot show that no request is sent | T11 |
| F6.AC10 | `F6.AC10 payments are listed newest first` in `tests/services/get-settle-up.test.ts` | T4 |
| F6.AC11 | `F6.AC11 no expenses gives no suggestions` in `tests/domain/settle-up.test.ts`; `F6.AC11 no suggestions and no payments give the settled copy and the empty payments copy` in `tests/domain/settle-up-view.test.ts`; `F6.AC11 a trip with no expenses has no suggestions` in `tests/services/get-settle-up.test.ts`; `F6.AC11 settled and empty-payments copy match the approved text` in `tests/domain/settle-up-messages.test.ts` | T1, T2, T4 |
| F6.AC12 | `F6.AC12 refuses a request with no session and reads nothing`, `F6.AC12 another owner's trip gives not_found and no data` in `tests/services/get-settle-up.test.ts`; the same pair in `record-payment.test.ts` and `delete-payment.test.ts`. Code review: every settle-up query reads and writes only the owner's trips and payments (F6.T8) | T4, T5, T8 |
| F6.AC13 | `F6.AC13 a payment that now exceeds the debt stays listed, the expense delete is not blocked, and the suggestions show the new direction` in `tests/services/get-settle-up.test.ts` | T4 |
| F6.AC14 | `F6.AC14 a payment recorded on 18 Nov 2026 shows that date` in `tests/domain/settle-up-view.test.ts` | T2 |
| F6.AC15 | `F6.AC15 a suggestion is recorded in one call with no confirm step` in `tests/services/record-payment.test.ts`; `F6.AC15 a suggestion row reads "Jo pays Sam 40.00" with the Mark as paid label` in `tests/domain/settle-up-view.test.ts` | T2, T5 |
| F6.AC16 | `F6.AC16 a loaded section always carries the note`, `F6.AC16 the loading and failed states give their approved copy` in `tests/domain/settle-up-view.test.ts`; `F6.AC16 note text matches the approved copy` in `tests/domain/settle-up-messages.test.ts` | T2 |

Not an F6 AC, but covered: F6.R15 (a person in a payment cannot be removed) is tested under F3.AC11 in `tests/services/person-usage.test.ts` (T6). The database foreign keys (F6.T7) are checked in code review.

## Sent back to spec
None.

## Decisions log
- 2026-11-19: Suggestions come from F5's `computeBalances` through a pure `suggestPayments` function, and R6 is applied as written, with ties broken by the order people were added → the spec settles this (F6.R1, F6.R2), and the function is testable without a database.
- 2026-11-19: One `GET settle-up` returns both the suggestions and the payments → one request, so the two lists always come from the same read and the section has one loading state.
- 2026-11-19: Recording a payment re-checks the suggestion and inserts inside one immediate SQLite transaction, through `PaymentStore.recordIfCurrent` → F6.R7 must refuse a second payment from two tabs. The check and the insert must be one unit, and `better-sqlite3` transactions are synchronous, so the callback cannot await.
- 2026-11-19: The payment's payer and payee use composite foreign keys to `people(trip_id, id)`, with `UNIQUE (trip_id, id)` added to `people` → the database then refuses a payment across trips, not only the code. The spec's Constraints section asks for this. It changes F3's table, so the migration needs approval (F6.T7).
- 2026-11-19: Payments are ordered by a `position` column, as expenses are (F4.R7) → two payments saved in the same millisecond still list in the order they were saved.
- 2026-11-19: The payment check joins F4's expense check in `makePersonUsage`, through a separate `PaymentUsage` port → F3.AC11 and F3.R9 are unit-tested with fakes, and each feature adds its own check as F3's and F4's plans set out.
- 2026-11-19: F5's stub payment reader is replaced by `PaymentStore`, and the stub file is deleted → F5's plan said F6 replaces it, and a second reader would let the two disagree.
- 2026-11-19: Error codes: `invalid_payment` (400) for R6; `payment_changed` (409) for R7; `not_found` (404) for a missing or foreign trip or payment; the existing `invalid_body`, `not_logged_in` and `internal` codes → the spec asked the plan to set the refusal shape, and the codes match F1–F5.
- 2026-11-19: F6.AC9 (Cancel changes nothing) is checked in code review, because it is UI wiring that sends no request → no service call happens on Cancel, so a service test would prove nothing.
- 2026-11-19: F6.R15 has no AC in the spec; its tests carry F3.AC11, the AC that states the rule → it keeps the one-AC-per-test convention without inventing an ID.
- 2026-11-19: The loading and failed states have no AC in the spec, so their test sits under F6.AC16 (the section copy) → the spec's States & errors are approved copy, and the test keeps them checked.
- 2026-11-19: No setup task. `app/` does not exist yet, and F1.T1 is the scaffold that F2–F5 rely on → repeating it would conflict with the approved F1–F5 plans.
- 2026-11-19: One task needs human approval: F6.T7 (migration, including F3's `people` table) → project-rules › Working with AI. No auth, env, CI, deploy change, or test deletion.
- 2026-11-19: Money travels as `amountCents`, a whole number checked with `Number.isSafeInteger` in `validatePaymentRequest`. The client never parses or rounds a typed amount → CLAUDE.md › Money; the user cannot type an amount (F6.R4).
- 2026-11-19: Plan revised for F3's plan, which now creates `UNIQUE (trip_id, id)` on `people` in F3.T6. F6 no longer changes `people`: F6.T7 only adds the `payments` table, and Data model changes and the Approach say so. This supersedes the earlier entries that put the `people` key in F6.T7 and called it a change to F3's table → F3's plan adds the key before any row exists, so F6 needs no rebuild of `people`. F6.T7 still needs human approval, for the payments migration.
- 2026-11-19: Plan approved by the user, with status set to Approved → the user asked for approval after this revision. No spec change, no open sent-back items, and no open spec questions.
