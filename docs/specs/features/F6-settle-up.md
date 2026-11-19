# F6 — Settle up

_Status: Approved · Last updated: 2026-11-19 · Source: product.md › Overview, Goals (balances correct), Assumptions (money moves outside the app, no editing, whole cents), Key terms (Suggested payment, Payment), Business rules (R4, R5, R6, R7, R8), MVP scope (F6), Worked examples (1, 3); F1 spec (F1.R10); F2 spec (F2.R7, F2.R8, F2.R9); F3 spec (F3.R6, F3.R9); F4 spec (F4.R7, F4.R9); F5 spec (F5.R1, F5.R3, F5.R4, F5.R9, F5.R12)_

## Summary
The trip page shows the suggested payments that settle the trip: who should pay whom, and how much, so that every balance reaches zero. The user marks a suggested payment as paid once the money has moved outside the app, and the app records it. Each recorded payment changes the balances, so the suggestions update. A user can delete a payment recorded by mistake. This feature adds a Settle up section below the Balances section built in F5. It reads the balances from F5, and its payments are the input F5 already takes (F5.R12).

## User stories
- As a user, I want to see the suggested payments that settle the trip, so that I know who should pay whom.
- As a user, I want to mark a suggested payment as paid with one click, so that the balances reflect the money that has moved.
- As a user, I want to see the payments I have recorded, with the date, so that I can check them.
- As a user, I want to delete a payment I recorded by mistake, so that the balances go back to what they were.

## Scope
**In:** Suggested payments calculated from the current balances with the R6 rule; marking a suggested payment as paid, which records a payment without a confirm step; a note that money moves outside the app; a list of the trip's payments; deleting a payment after confirmation; the rule that a payment must match a current suggestion when it is recorded; the login and ownership check on every settle-up endpoint (F1.R10).
**Out:**
- Editing a payment or its amount — product.md › Assumptions (no editing). A mistake is fixed by deleting the payment.
- Recording a payment that is not a suggestion (any amount, any pair of people) — product.md › R6 only produces suggestions; no other way to record a payment is defined.
- Money moving inside the app, or any record of how it was paid — product.md › Overview and Assumptions (money moves outside the app).
- Currencies and conversion — product.md › After the core (out of scope).

## User flow & screens
1. The user opens a trip (F2). The trip page shows the People section (F3), the Expenses section (F4), the Balances section (F5), then the **Settle up** section.
2. The Settle up section starts with a note: "Money moves outside the app. Mark a payment as paid once it's done." (F6.R12).
3. Below the note, the section lists the suggested payments in the order given by F6.R2. Each row reads "[Payer] pays [Payee] [amount]" with a "Mark as paid" button.
4. The user chooses "Mark as paid". The payment is recorded at once, with no dialog (F6.R4, F6.R16). The Settle up and Balances sections then show the new state (F6.R5, F6.R8).
5. Below the suggestions is the payments list, newest first (F6.R9). Each row reads "[Payer] paid [Payee] [amount]" and shows the date recorded, with a delete action.
6. The user chooses delete on a payment. A confirm dialog names the payment and asks the user to confirm (F6.R10). On confirm, the payment is removed and the suggestions and balances are recalculated.
7. When no suggested payments remain, the section shows "Everyone is settled up." (F6.R12). The recorded payments stay listed.

Screen names: trip page (F2), Settle up section (this feature). No mock screens are on `docs/design`; the placement follows the sections built in F3–F5.

## Requirements
- **F6.R1** Suggested payments are calculated from the current balances (F5.R1, which includes recorded payments, F5.R12) by product.md › R6: the person who owes the most pays the person owed the most, and the amount is the smaller of the two amounts. Once one of them is settled, they are removed from the calculation, and the steps repeat until all balances are zero. R6 is the rule used for suggestions; it is applied as written.
- **F6.R2** When two or more people owe the same amount, or are owed the same amount, the person added to the trip first (F3.R6) is matched first. The suggested payments are listed in the order they are matched.
- **F6.R3** Suggested payments are not stored. They are calculated each time they are requested, from the current people, expenses and payments (same approach as F5.R9).
- **F6.R4** Marking a suggested payment as paid records a payment with the payer, payee and amount exactly as the suggestion shows at the time it was requested. The amount cannot be typed or changed (product.md › Assumptions, no editing).
- **F6.R5** A recorded payment counts in the balances as product.md › R4 says: the payer's balance rises by the amount (they owe less) and the payee's balance falls by the amount (they are owed less). The balances still add up to exactly zero (product.md › R5; F5.R6).
- **F6.R6** A payment has a payer and a payee who are different people on the same trip, and an amount that is a whole number of cents greater than zero. Suggested payments always meet these rules by construction; the check guards requests that do not come from a suggestion.
- **F6.R7** A mark-as-paid request is refused unless its payer, payee and amount match a suggested payment calculated from the current balances at the time of the request. A refused request records nothing, and the user is told to refresh. A repeated submit of the same suggestion, from the same page or another tab, is refused once the first one has been saved, because the suggestion no longer exists. This means a double click cannot record two payments.
- **F6.R8** Suggested payments are recalculated after every change to people, expenses or payments, as F5.R9 does for balances. Adding or deleting an expense can change the suggestions, and so can recording or deleting a payment.
- **F6.R9** The payments list shows every payment on the trip, newest first (F4.R7 uses the same order for expenses). Each row reads "[Payer] paid [Payee] [amount]" and shows the date recorded, formatted as "18 Nov 2026" in the user's local time zone, the same as F2.R7. The date is stored in UTC and converted for display only. Amounts are shown as in F5.R4: two digits after the decimal point, no thousands separators, no currency symbol. A payment is listed from the moment it is recorded until it is deleted.
- **F6.R10** Deleting a payment asks the user to confirm in a dialog that names the payment (F2.R9, F4.R9 pattern). On confirm, the payment is removed. On cancel, nothing changes. After a delete, the balances and suggested payments are recalculated (F6.R8).
- **F6.R11** Deleting a payment is always allowed. No rule in product.md blocks it, so a payment can be deleted even if other payments depend on the balance it changed.
- **F6.R12** The Settle up section shows the note "Money moves outside the app. Mark a payment as paid once it's done." (product.md › Assumptions). When every suggested payment has been recorded as paid, every balance on the trip is zero, no suggested payments remain, and the section shows "Everyone is settled up." (product.md › MVP scope, F6 "Done when"; Worked example 3).
- **F6.R13** A payment stays as recorded if a later change makes it exceed what the payer owes (for example, an expense is deleted after a payment). The balances then show the new position, and the suggestions show the new direction of any remaining debt (F6.R1). Deleting an expense is never blocked by a payment. Product.md has no rule that removes a recorded payment for this reason, and the user chose to keep it as recorded.
- **F6.R14** Every settle-up request (list suggestions, list payments, record a payment, delete a payment) requires a logged-in user and checks that the trip belongs to that user (F1.R10). A request that fails either check is refused with no data returned. A trip owned by another user is treated as not found (F2.R8).
- **F6.R15** A person who is in any recorded payment cannot be removed from the trip (product.md › R7; F3.R9). This feature does not change that rule. It only creates the payment records that F3's check reads.
- **F6.R16** Marking a suggested payment as paid takes one click and records the payment at once. There is no confirm dialog. A mistake is undone by deleting the payment (F6.R10).

## Data & contract
- **Payment record** (new): `id`, `trip_id` (references the trip), `payer_id` (references a person on the same trip), `payee_id` (references a person on the same trip, different from the payer), `amount_cents` (integer, greater than zero, F6.R6), `created_at` (UTC, shown as local date, F6.R9). Derived from product.md › Key terms (Payment) and Business rules R4, R7; F6.R4, F6.R6.
- **Suggested payments:** calculated, not stored (F6.R3). Each suggestion has a payer id, a payee id and an amount in cents. Whether the calculation is done in code or in the database is set in the plan.
- **Constraints:** `amount_cents` is a whole number greater than zero. `payer_id` and `payee_id` are on `trip_id` and differ from each other (F6.R6). A person referenced by a payment cannot be deleted (F6.R15, F3.R9). Deleting a payment removes only that row. Deleting a trip removes its payments (F2.R9).
- **Relationships:** a trip has many payments. A payment has one payer and one payee, both people on the trip. F5 reads payments as an input to the balance calculation (F5.R12).
- **Operations needed:** list the suggested payments of one trip; list the payments of one trip; record a payment, which takes the payer, payee and amount and checks them against the current suggestions (F6.R7); delete one payment of a trip. Each takes the user from the session (F1), never from the request body or URL alone.
- **Exact routes, request and response bodies, and error shapes:** set in the plan, after the stack is chosen. The not-found response for a payment or trip owned by another user must match the response for a trip that does not exist (F2.R8). The refusal in F6.R7 needs its own error shape; the plan sets it.
- **Browser storage:** none beyond the session (F1).

## States & errors
Copy below is proposed by the user (2026-11-19) and is approved as written.
- **Settle up section, loading:** a loading indicator is shown while suggestions and payments are fetched. Copy: "Loading…"
- **Settle up section, loaded with suggestions:** the note (F6.R12), then one row per suggested payment in the order of F6.R2, each reading "[Payer] pays [Payee] [amount]" with a "Mark as paid" button (F6.R4).
- **Settle up section, no suggestions:** no suggestion rows. Copy: "Everyone is settled up." (F6.R12). This covers a trip with no people and a trip where every balance is already zero.
- **Payments list, empty:** no payment rows. Copy: "No payments yet."
- **Payments list, loaded:** one row per payment (F6.R9), reading "[Payer] paid [Payee] [amount]", with the date recorded and a delete action.
- **Mark as paid, saving:** the button shows "Saving…" and is disabled until the request ends (F6.R7).
- **Mark as paid refused (F6.R7):** nothing is recorded, the section refreshes to the current suggestions, and the message is shown. Copy: "This payment has changed. Refresh to see the latest."
- **Delete payment dialog (F6.R10):** title "Delete this payment?"; body "[Payer] paid [Payee] [amount] will be removed and the balances will update."; buttons "Delete payment" (while the request is running, it shows "Deleting…") and "Cancel".
- **Settle up request failed:** the section shows an error and the rest of the trip page still works. Copy: "We couldn't load settle up. Try again."
- **Labels:** section heading "Settle up".

## Accessibility
- Each suggestion row and payment row is one text unit that a screen reader reads in full, with the payer first, then the payee and the amount.
- The "Mark as paid" button has the accessible name "Mark [Payer] pays [Payee] [amount] as paid", so the payment it records is named even when the row is not read in full. The visible label stays "Mark as paid".
- The delete dialog takes focus when it opens, returns focus to the delete action it came from when cancelled, and closes on Escape, as the F2 and F4 dialogs do.
- Meaning does not rely on colour. Payments are shown as words ("pays", "paid") and amounts, the same way balances are shown in F5.
- The note and the section heading use the same heading level and text structure as the Balances section (F5).
- Reduced motion: no animation is added by this feature.

## Edge cases
- A trip with no people, or where every balance is already zero: there are no suggestions; the section shows "Everyone is settled up." (F6.R12).
- A trip with one person: their balance is zero, so there are no suggestions (F6.R1; F5.AC5 pattern).
- Two people owe the same amount, or two are owed the same amount: the order rule applies (F6.R2).
- Three people, one owed the total and two owing equal shares: two suggestions, both paying the same person, in the order added (F6.R1, F6.R2; AC2).
- A suggestion that is only partly covered by the smaller amount: the next suggestion covers the rest of the larger balance (F6.R1; Worked example 1).
- Marking a suggestion paid, then marking the same suggestion paid again in another tab: the second request is refused (F6.R7; AC6).
- Marking a suggestion paid, then adding an expense that changes the balances: the recorded payment stays; the suggestions show what is still owed (F6.R8, F6.R13).
- Deleting an expense after a payment was recorded, so the payment now exceeds what the payer owes: the payment stays, the balances show the new position, and the suggestions show the new direction. Deleting the expense is not blocked (F6.R13).
- Deleting a payment that another tab already deleted: the request finds no such payment and is refused as not found, the same way a missing trip is (F2.R8). The page then refreshes.
- Deleting a payment and cancelling the dialog: nothing changes (F6.R10).
- A person in a recorded payment cannot be removed (F6.R15, F3.R9). A person who is only in a suggestion, but not yet paid, can be removed: suggestions are not "in use" (F3 Edge cases; product.md › Key terms, Payment).
- A large amount: the amounts are sums of whole cents and are never rounded (F5.R3). They are shown as in F5.R4.

## Acceptance criteria
- **F6.AC1** Given the trip in product.md Worked example 1 (Sam, Alex and Jo; Sam paid 90.00 and Alex paid 30.00, both shared by all three), when the suggested payments are requested, then the suggestions are Jo pays Sam 40.00 and Alex pays Sam 10.00 (F6.R1; Worked example 1).
- **F6.AC2** Given Sam, Alex and Jo added in that order, and Sam paid 30.00 shared by all three, when the suggested payments are requested, then the suggestions are Alex pays Sam 10.00 and Jo pays Sam 10.00, in that order (F6.R1, F6.R2).
- **F6.AC3** Given the trip in F6.AC1 and Jo pays Sam 40.00 recorded as paid, when the suggested payments are requested, then the only suggestion is Alex pays Sam 10.00 (F6.R1, F6.R5; Worked example 3).
- **F6.AC4** Given the trip in F6.AC1 with no payments, when the user chooses "Mark as paid" on "Jo pays Sam 40.00", then a payment is recorded with payer Jo, payee Sam and amount 40.00, the payments list shows "Jo paid Sam 40.00", and the balances are Sam is owed 10.00, Alex owes 10.00 and Jo is settled (F6.R4, F6.R5; F5.AC8).
- **F6.AC5** Given the trip in F6.AC1, when both suggested payments are marked as paid, then no suggested payments remain, the section shows "Everyone is settled up.", and every balance is settled (F6.R12).
- **F6.AC6** Given a suggestion already recorded as paid, when the same payer, payee and amount are sent again as a mark-as-paid request, then the request is refused, the message "This payment has changed. Refresh to see the latest." is shown, no second payment is recorded, and the balances do not change (F6.R7).
- **F6.AC7** Given a mark-as-paid request where the payer and the payee are the same person, or where the amount is zero, when the request is handled, then it is refused and no payment is recorded (F6.R6).
- **F6.AC8** Given the payment recorded in F6.AC4, when the user chooses "Delete payment" in the dialog and then confirms, then the payment is removed, the payments list no longer shows it, and the balances and suggestions return to the state in F6.AC1 (F6.R10, F6.R8).
- **F6.AC9** Given the payment recorded in F6.AC4, when the user chooses delete and then "Cancel", then the payment stays and nothing changes (F6.R10).
- **F6.AC10** Given payments recorded on a trip in the order A, then B, then C, when the payments list is shown, then the rows are listed C, B, A (F6.R9).
- **F6.AC11** Given a trip with no expenses, or a trip where all balances are settled, when the Settle up section is shown, then it shows no suggestion rows and "Everyone is settled up." (F6.R12).
- **F6.AC12** Given a request for settle-up data or a settle-up change with no logged-in session, or for a trip owned by another user, when the request is handled, then it is refused and no data is returned (F6.R14). Unit test: the access check refuses both. Code review: the settle-up queries only read and write trips and payments scoped to the logged-in owner.
- **F6.AC13** Given a recorded payment and an expense that is then deleted so that the payment exceeds what the payer owes, when the balances are requested, then the payment is still listed, the expense delete was not blocked, the balances add up to zero, and the suggestions show the new direction (F6.R13, F6.R5).
- **F6.AC14** Given a recorded payment from Jo to Sam for 40.00 made on 18 Nov 2026 in the user's local time zone, when the payments list is shown, then the row reads "Jo paid Sam 40.00" and shows "18 Nov 2026" (F6.R9; F2.R7).
- **F6.AC15** Given a suggested payment, when the user chooses "Mark as paid", then the payment is recorded after that one click, with no dialog shown (F6.R16).
- **F6.AC16** Given the Settle up section with at least one suggestion or payment, when it is shown, then the note "Money moves outside the app. Mark a payment as paid once it's done." is shown above the suggestions (F6.R12).

## Dependencies
- **Depends on:** F1 (login and the ownership check, F1.R10), F2 (the trip page and the trip, F2.R7 date format, F2.R8, F2.R9), F3 (the people who can be payers and payees, F3.R6 order, F3.R9 removal check, which this feature's payments now feed), F4 (expenses and shares, F4.R7, F4.R9), F5 (the balances that suggestions are built from, F5.R1, F5.R9, F5.R12).
- **Needed by:** none. F6 is the last MVP feature in product.md › MVP scope.
- **Build order:** step 6 (inferred: F5 is step 5).
- **External services:** none.

## Test plan
Unit tests only (project rules). Each test uses the worked examples in product.md where possible.
- Suggestion calculation on Worked example 1 data → F6.AC1 (F6.R1).
- Suggestion calculation with two equal debtors, added in a known order → F6.AC2 (F6.R2).
- Suggestion calculation after a fake payment of 40.00 from Jo to Sam (Worked example 3) → F6.AC3 (F6.R5).
- Termination and zero-sum: the calculation ends with no suggestions and the balances sum to exactly zero, for the worked example data and for a case with uneven cents → F6.AC5, F6.R12, product.md R5.
- Record a payment with a suggestion that matches → the stored payment has the suggestion's payer, payee and amount; recorded in one call with no confirm step → F6.AC4, F6.AC15 (F6.R4, F6.R16).
- Record a payment that does not match any current suggestion, or that matches one already recorded → refused, nothing stored, refusal message → F6.AC6 (F6.R7).
- Payer equals payee, zero amount, negative amount → refused → F6.AC7 (F6.R6).
- Delete service: confirmed delete removes the payment; cancelled delete does nothing → F6.AC8, F6.AC9 (F6.R10).
- Payments list order: newest first → F6.AC10 (F6.R9).
- Row text and date formatting: "[Payer] paid [Payee] [amount]", date as "18 Nov 2026" in local time, amount with two decimals and no separators → F6.AC14 (F6.R9, F2.R7, F5.R4).
- No-suggestions case (no people, and all zero) → F6.AC11.
- Note shown whenever the section has suggestions or payments → F6.AC16 (F6.R12).
- Access check on every settle-up operation: refuses a request with no session, and refuses a request for another owner's trip (returns the same response as a missing trip) → F6.AC12, F6.R14.
- Balance after an expense is deleted with a payment that now exceeds the debt; the expense delete succeeds → F6.AC13 (F6.R13).
- Query scoping to the logged-in owner (every settle-up query reads and writes only that owner's trips and payments) → F6.AC12, by code review. The check needs the database to prove, so a unit test cannot show it.
- Cascade on trip delete removes payments → F2.AC10 covers the cascade; F6 adds no test beyond it. Code review: the cascade includes the payments table.

## Open questions
None.


## Decisions log
- 2026-11-19: Which rule decides the suggested payments, given the product.md Goal "as few payments as possible" and R6 (greedy, which can need one more payment than the true minimum)? → R6 wins: it is the specific rule, and the Goal is general. Suggestions follow R6 as written (F6.R1). product.md is not edited; the Goal stays as it is.
- 2026-11-19: Where do suggested payments and recorded payments appear on the trip page? → A new Settle up section below Balances: a note, suggested payments with a Mark as paid button, then a payments list, newest first, each with delete (F6 User flow, F6.R9, F6.R12).
- 2026-11-19: When two people owe the same amount, or are owed the same amount, which is matched first? → The person added to the trip first, as in the People and Balances lists (F6.R2).
- 2026-11-19: Does deleting a payment ask the user to confirm? → Yes, a confirm dialog that names the payment (F6.R10).
- 2026-11-19: Does marking a suggestion as paid ask the user to confirm? → No. One click records it at once; a mistake is undone by deleting the payment (F6.R16, AC15).
- 2026-11-19: A mark-as-paid that no longer matches a current suggestion (stale page, second tab) → Refused; nothing is recorded, and the message "This payment has changed. Refresh to see the latest." is shown (F6.R7, AC6).
- 2026-11-19: A recorded payment that later exceeds what the payer owes (for example, after an expense is deleted) → Keep it as recorded. Deleting an expense is not blocked (F6.R13, AC13).
- 2026-11-19: What does each payment row show? → "[Payer] paid [Payee] [amount]" and the date recorded, as "18 Nov 2026" in local time, the same format as F2.R7 (F6.R9, AC14).
- 2026-11-19: Copy for all states and messages? → Approved as written in States & errors and the User flow: heading "Settle up"; note "Money moves outside the app. Mark a payment as paid once it's done."; row "[Payer] pays [Payee] [amount]"; button "Mark as paid" with accessible name "Mark [Payer] pays [Payee] [amount] as paid"; "Everyone is settled up."; "No payments yet."; "This payment has changed. Refresh to see the latest."; delete dialog title "Delete this payment?", body "[Payer] paid [Payee] [amount] will be removed and the balances will update.", buttons "Delete payment" and "Cancel"; "Loading…"; "We couldn't load settle up. Try again."; in-flight labels "Saving…" and "Deleting…".
- 2026-11-19: Are suggested payments stored? → No, calculated each time they are requested, as balances are (F6.R3). This follows from F5.R9 and was not asked separately.
- 2026-11-19: Can a payment amount be typed or changed? → No. The amount is the suggestion's amount (F6.R4). This follows from product.md › Assumptions (no editing) and was not asked separately.
- 2026-11-19: Does a recorded payment change balances? → Yes, as product.md R4 says: the payer's balance rises and the payee's falls (F6.R5). This follows from R4 and F5.R12 and was not asked separately.
- 2026-11-19: Approve F6? → Yes, approved with the copy above. Status set to Approved. Open questions are empty.
- 2026-11-19: Is a payment for an amount that is not a suggestion allowed? → Not in this spec. Only suggestions can be recorded (Scope, F6.R7). This follows from R6 and was not asked separately.
