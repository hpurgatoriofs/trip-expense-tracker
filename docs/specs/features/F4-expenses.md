# F4 — Expenses

_Status: Approved · Last updated: 2026-11-19 · Source: product.md › Overview, Goals (four inputs), MVP scope (F4), Assumptions (equal splits, no editing, whole cents, one currency), Key terms (Expense), Business rules (R1, R2, R3, R5, R7); F2 spec (trip page, F2.R6, F2.R7, F2.R9); F3 spec (people, F3.R6, F3.R9)_

## Summary
A user records an expense on a trip: what it was, how much it cost, who paid, and who shares it. The amount is split equally between the people sharing it, to the cent. The trip page shows the expenses, newest first, and the user can delete an expense they added by mistake. This feature adds the expenses section to the trip page built in F2 and uses the people added in F3. Balances (F5) and settle-up (F6) read the expenses recorded here.

## User stories
- As a user, I want to record an expense with a description, amount, payer and the people sharing it, so that the trip's spending is tracked.
- As a user, I want the amount split equally to the cent, so that nobody is charged more than their fair share.
- As a user, I want to see the trip's expenses, newest first, so that I can check what has been recorded.
- As a user, I want to delete an expense after confirming, so that I can fix a mistake by removing and adding it again.

## Scope
**In:** Add an expense (description, amount, payer, participants) to a trip; equal split to the cent with leftover cents assigned as product.md R3 says; list the trip's expenses; delete an expense after confirmation; the rule that the payer and participants must be people on the same trip; the expense reference that F3's removal check reads; the login and ownership check on every expense endpoint (F1.R10).
**Out:**
- Editing an expense — product.md › Assumptions (no editing). A mistake is fixed by deleting and adding again.
- Uneven splits, custom shares, or percentages — product.md › Assumptions (equal splits only) and After the core.
- Currencies or conversion — product.md › Assumptions (one currency) and After the core.
- An expense date chosen by the user. The four inputs in product.md › Goals are what, how much, who paid and who shares; the only date shown is the date the expense was added (F4.R8).
- Balances per person and the "is owed / owes" display — F5.
- Suggested payments and marking them paid — F6.
- Attachments, receipts, categories, notes — not in product.md, so not built (see Decisions log).
- Adding people inside the expense form — F3 owns people; the form only chooses from people already on the trip.
- Trip deletion removes its expenses — F2.R9 (already specified); no new rule here.

## User flow & screens
1. **Trip page, expenses section:** the trip page (F2) shows an Expenses section below People. It lists the trip's expenses, newest first (F4.R7). If there are none, the empty state is shown.
2. **Add expense:** the user chooses Add expense. A form opens with:
   - **Description** — a text field.
   - **Amount** — a text field that accepts digits and one decimal point.
   - **Paid by** — a choice of one person from the trip's people. Nothing is pre-selected (F4.R3).
   - **Shared by** — a checkbox per person on the trip. All people are ticked when the form opens (F4.R4). The user may untick people; at least one must stay ticked.
   The user submits with "Save expense". On success, the expense is saved, the form closes, and the new expense appears at the top of the list.
3. **Delete expense:** the user chooses Delete next to an expense. A confirm dialog opens, naming the expense. Confirm deletes it. Cancel closes the dialog and changes nothing (F4.R9).
4. **Add or delete refused or failed:** the user sees the message for the case (States & errors). The form keeps what was typed, or the list stays as it was.

Mock screens: none found in `docs/design`. Screens needed: Trip page expenses section (with empty states), Add expense form, Delete confirm dialog.

## Requirements
- **F4.R1** An expense has a description. The description is required. Before it is checked and saved, leading and trailing spaces are removed. A description that is blank after trimming is refused. A description is at most 100 characters, counted after trimming. (Decided; matches the trip name rule in F2.R1–R3.)
- **F4.R2** An expense has an amount. The amount is required and must be greater than zero (product.md › R1). The largest amount is 1,000,000.00 (Decided).
  - The amount is typed using only digits (0–9) and at most one decimal point. No thousands separators, currency symbols or other characters are accepted (Decided). A comma is refused with its own message (States & errors).
  - Up to two digits may follow the decimal point. Valid examples: "10", "10.5", "10.50" and "0.5" (Decided). A decimal point needs a digit on both sides: ".5" and "10." are refused (Decided). An amount with more than two digits after the decimal point is refused and nothing is saved; it is not rounded (Decided).
  - The amount is stored as a whole number of cents (product.md › Assumptions).
- **F4.R3** An expense has exactly one payer, chosen from the people on the same trip (product.md › R2). The payer is required. No payer is selected when the form opens (Decided).
- **F4.R4** An expense has at least one participant, chosen from the people on the same trip (product.md › R2). All people on the trip are selected when the form opens (product.md › MVP scope F4, "everyone by default"). The payer does not have to be a participant (product.md › R2). An expense with no participants is refused.
- **F4.R5** The amount is split equally between the participants. Each participant's share is the amount divided by the number of participants, rounded down to the cent. The leftover cents go one each to the participants, only, in the order they were added to the trip, starting from the earliest added (product.md › R3). People who are not participants never receive a leftover cent. The shares of one expense add up to exactly its amount.
- **F4.R6** An expense is saved only if every check in F4.R1–R4 passes. A refused expense is not saved, and no part of it is kept.
- **F4.R7** The trip page lists the expenses of that trip, newest first, by the time they were added (Decided). If two expenses have the same added time, the one saved later is listed first (Decided).
- **F4.R8** Each row in the expense list shows the description, the amount, the payer's name and the date the expense was added. The date is formatted as "18 Nov 2026" in the user's local time zone, the same format as F2.R7. The date is stored in UTC and converted to local time for display only. Each row does not show the split; the split is shown by balances in F5.
- **F4.R9** Deleting an expense asks for confirmation first (Decided). Confirm deletes the expense; Cancel changes nothing. Deletion is permanent (product.md › Assumptions, no editing; the same as F3.R10).
- **F4.R10** Two expenses on one trip may have the same description (Decided). Descriptions are labels only; rows are told apart by amount and date.
- **F4.R11** Every expense belongs to one trip. Deleting the trip deletes its expenses (F2.R9, product.md › R8).
- **F4.R12** The payer and every participant must be people on the same trip as the expense. A request naming a person from another trip, or a person who does not exist, is refused and nothing is saved (product.md › R2).
- **F4.R13** While a person is the payer or a participant of an expense, that person cannot be removed (product.md › R7; F3.R9). This feature provides the expense reference that F3's removal check reads.
- **F4.R14** Every expense endpoint requires a logged-in user and checks that the trip belongs to that user, as F1.R10 requires. A request that fails either check is refused with no expense data returned.
- **F4.R15** An expense cannot be added to a trip with no people, because the payer is required (F4.R3). The Add expense control is not offered in that case; the empty state explains why.

## Data & contract
- **Expense record** (new): `id`, `trip_id` (references the trip), `description` (required, 1–100 characters after trimming), `amount_cents` (integer, greater than zero and at most 100,000,000 cents, i.e. 1,000,000.00), `payer_id` (references a person on the same trip), `created_at` (UTC). Derived from F4.R1–R3, F4.R7, product.md › Key terms and Assumptions, and the Decisions log.
- **Expense participants** (new): one row per participant, linking `expense_id` to `person_id`. At least one row per expense (F4.R4). Each `person_id` must belong to the same trip as the expense (F4.R12).
- **Shares:** the share of each participant is calculated from `amount_cents` and the number of participants by the rule in F4.R5. Whether shares are stored or calculated when read is set in the plan. Either way, the shares of one expense must add up to `amount_cents` exactly.
- **Constraints:** `amount_cents` is a whole number greater than zero and no more than the maximum (F4.R2). `payer_id` and each participant's `person_id` must be on `trip_id` (F4.R12). A person referenced by an expense cannot be deleted (F4.R13, F3.R9). Deleting an expense removes its participant rows. Deleting a trip removes its expenses (F4.R11).
- **Relationships:** a trip has many expenses. An expense has one payer and one or more participants, all people on the trip. F5 and F6 read expenses and their participants.
- **Operations needed:** list a trip's expenses, add an expense to a trip, delete one expense of a trip, and the "is this person in an expense?" check used by F3's removal. Each takes the user from the session (F1), never from the request body or URL alone.
- **Exact routes, request and response bodies, and error shapes:** set in the plan, after the stack is chosen. The not-found response for an expense on another user's trip must match the response for a trip that does not exist (F2.R8).
- **Browser storage:** none beyond the session (F1).

## States & errors
Copy below is approved as written (2026-11-19). The meaning of each state is fixed by the requirements.
- **Expenses section, loading:** a loading indicator is shown while expenses are fetched. Copy: "Loading expenses…"
- **Expenses section, failed to load:** the section shows the failure copy and a "Try again" button, which fetches the expenses again. The rest of the trip page is unchanged. Copy: "We couldn't load the expenses. Try again." Button: "Try again". Same as F2 and F3 (F4.AC27).
- **Expenses section, empty, trip has people:** Copy: "No expenses yet. Add the first one." Button: "Add expense".
- **Expenses section, empty, trip has no people:** no Add expense button (F4.R15). Copy: "Add people to this trip before you add an expense."
- **Expenses section, loaded:** rows as in F4.R8, newest first (F4.R7). Each row's button: "Delete".
- **Add expense, description blank after trimming:** shown next to the field; no expense is saved (F4.R1). Copy: "Enter a description."
- **Add expense, description longer than 100 characters:** shown next to the field; no expense is saved (F4.R1). Copy: "Descriptions can be up to 100 characters."
- **Add expense, amount empty, zero, negative, or not a number:** shown next to the amount field; no expense is saved (F4.R2). Copy: "Enter an amount greater than zero."
- **Add expense, amount contains a comma:** shown next to the amount field; no expense is saved (F4.R2). Copy: "Use digits and a decimal point only. No commas."
- **Add expense, amount with more than two digits after the decimal point:** shown next to the amount field; no expense is saved and the amount is not rounded (F4.R2). Copy: "Use at most two decimal places."
- **Add expense, amount above 1,000,000.00:** shown next to the amount field; no expense is saved (F4.R2). Copy: "Amounts can be up to 1,000,000.00."
- **Add expense, no payer chosen:** shown next to the payer choice; no expense is saved (F4.R3). Copy: "Choose who paid."
- **Add expense, no participant ticked:** shown next to the participant list; no expense is saved (F4.R4). Copy: "Choose at least one person to share this."
- **Add expense, payer or participant not on this trip:** the expense is not saved (F4.R12). Copy: "Someone in this expense is no longer on the trip. Reload the page and try again."
- **Add expense, request failed:** the user is told the expense was not saved and can try again; everything typed is kept. Copy: "We couldn't save this expense. Try again."
- **Delete dialog:** names the expense (F4.R9). Title: "Delete [description]?" Body: "This removes the expense. This can't be undone." Buttons: "Delete expense" and "Cancel".
- **Delete, request failed:** the user is told the expense was not deleted; it stays on the list. Copy: "We couldn't delete this expense. Try again."
- **Delete, expense already gone (for example deleted in another tab):** the list is refreshed; no other error is shown (Edge cases).
- **Labels, field names and form buttons:** Form labels: "Description", "Amount", "Paid by", "Shared by". Section heading: "Expenses". Buttons: "Add expense" (opens the form), "Save expense" (submits), "Cancel" (closes the form or dialog).
- **Loading on submit:** the Save expense and Delete expense buttons are disabled while their request is in flight, so a normal double click sends one request. Labels while in flight: "Saving…" (Save expense) and "Deleting…" (Delete expense).

## Accessibility
- Every field in the Add expense form has a visible label. The amount field accepts keyboard entry of digits and a decimal point.
- Errors are linked to the field they belong to and announced to screen readers.
- The participant checkboxes sit in a group with a visible label ("Shared by"), and each one names its person.
- The payer choice names its options by person name and is operable with the keyboard only.
- Each expense's Delete action names the expense for screen readers (for example "Delete Dinner, 90.00"), not just "Delete" repeated.
- The delete dialog traps focus while open, puts focus on its first action, returns focus to the Delete button that opened it when closed, and closes on Escape (same as Cancel). This follows F2 and F3.
- The destructive action in the dialog is labelled clearly ("Delete expense"), not only by colour.
- Everything is reachable and operable with the keyboard only.
- Contrast and focus styles follow the app's theme once the stack is chosen.
- No motion is used beyond a loading indicator; reduced-motion rules apply to any animation added.

## Edge cases
- Description of only spaces: refused as blank (F4.R1).
- Description of 100 characters after trimming: accepted. 101: refused (F4.R1).
- Amount of 0, 0.00, or a negative number: refused (F4.R2, product.md › R1).
- Amount "10", "10.5" or "10.50": all accepted (F4.R2).
- Amount "1,000.00" (comma): refused with its own message; the comma is not removed silently (F4.R2).
- Amount ".5" or "10.": refused with "Enter an amount greater than zero." (F4.R2).
- Amount 10.005 (three digits after the decimal point): refused; not rounded (F4.R2).
- Amount 10.00 with three participants: shares 3.34, 3.33, 3.33 (product.md › Example 2; F4.R5).
- Amount 90.00 with three participants: shares 30.00 each (product.md › Example 1).
- Amount 0.01 with three participants: shares 0.01, 0.00, 0.00 — the one cent goes to the earliest-added participant (F4.R5).
- Amount 0.05 shared by Alex and Jo only, with Sam not a participant: Alex 0.03, Jo 0.02 — the leftover cent goes to Alex, the earlier-added participant, and Sam is skipped (F4.R5).
- Payer not ticked as a participant: allowed; the payer is owed their whole share back through balances (F4.R4, product.md › R2).
- Payer is the only participant: allowed; the share is the whole amount.
- All participants unticked: refused (F4.R4).
- Two expenses added at the same time: the one saved later is listed first (F4.R7).
- Two identical expenses (same description, amount, payer, participants) entered twice: both are saved (F4.R10). Product.md does not ask for de-duplication.
- Double submit on add: the button is disabled while its request is in flight. A second request that gets through creates a second expense; no server-side de-duplication is required (same as F2's create-trip edge case).
- Delete a person who is the payer or a participant of an expense: refused (F4.R13, F3.R9).
- Delete an expense in another tab, then delete it again here: the second request finds no expense and is treated as not found; the list is refreshed.
- Trip with people removed so that only one person remains: still valid; the remaining person can be payer and only participant.
- Trip with many expenses: all are listed newest first; no limit is set in product.md.
- Opening an expense of another user's trip (through its trip page): not-found, same as F2.R8.
- Cancel the delete dialog: nothing changes.

## Acceptance criteria
- **F4.AC1** Given a trip with people, when the user adds an expense with a valid description, amount, payer and participants, then it is saved on that trip and listed at the top of the list.
- **F4.AC2** Given a description that is blank or only spaces, when the user adds it, then no expense is saved and the user sees "Enter a description." next to the field.
- **F4.AC3** Given a description of more than 100 characters after trimming, when the user adds it, then no expense is saved and the user sees a message next to the field.
- **F4.AC4** Given a description with leading or trailing spaces, when the user adds it, then the saved description has those spaces removed.
- **F4.AC5** Given an amount of 0, 0.00, or a negative number, when the user adds the expense, then no expense is saved.
- **F4.AC6** Given an amount with three digits after the decimal point (for example 10.005), when the user adds the expense, then no expense is saved and the amount is not rounded.
- **F4.AC7** Given an amount above 1,000,000.00, when the user adds the expense, then no expense is saved.
- **F4.AC8** Given the Add expense form has just opened, then no payer is selected, and submitting without choosing one saves nothing.
- **F4.AC9** Given the Add expense form has just opened, then every person on the trip is ticked as a participant; unticking all of them and submitting saves nothing.
- **F4.AC10** Given a payer who is not ticked as a participant, when the expense is added, then it is saved.
- **F4.AC11** Given an expense of 10.00 shared by Sam, Alex and Jo (in that order added), then the shares are 3.34, 3.33 and 3.33, and they add up to 10.00.
- **F4.AC12** Given an expense of 90.00 shared equally by Sam, Alex and Jo, then each share is 30.00.
- **F4.AC13** Given an expense of 0.01 shared by three people, then the participant added to the trip earliest has a share of 0.01 and the others have 0.00.
- **F4.AC14** Given two expenses on one trip with the same description, when both are added, then both are saved and listed.
- **F4.AC15** Given a trip with several expenses, when the user views the trip page, then the expenses are listed newest first, each row showing its description, amount, payer and date added.
- **F4.AC16** Given a user who chooses Delete on an expense, when they choose Cancel, then the expense and the list are unchanged.
- **F4.AC17** Given a user who chooses Delete on an expense and confirms, then the expense is removed and no longer listed.
- **F4.AC18** Given a payer or participant who is not a person on this trip, when the expense is submitted, then no expense is saved and the user is told to reload the trip.
- **F4.AC19** Given a person who is the payer or a participant of an expense, when the user tries to remove that person, then the removal is refused (F3.AC10).
- **F4.AC20** Given a trip with no people, when the user views the expenses section, then the Add expense control is not offered and the empty-state message says people must be added first.
- **F4.AC21** Given a logged-out visitor, or a logged-in user acting on a trip they do not own, when they call any expense endpoint, then the request is refused and no expense data is returned (F1.R10).
- **F4.AC22** Given a trip with expenses, when the trip is deleted, then its expenses are removed (F2.AC10).
- **F4.AC23** Given people Sam, Alex and Jo added to the trip in that order, when an expense of 0.05 is shared by Alex and Jo only, then Alex's share is 0.03 and Jo's share is 0.02, and Sam receives no share.
- **F4.AC24** Given an amount containing a comma (for example "1,000.00"), when the user adds the expense, then no expense is saved and the user sees "Use digits and a decimal point only. No commas." next to the amount field.
- **F4.AC25** Given amounts "10", "10.5" and "10.50", when the user adds an expense with each, then all three are saved, as 1000, 1050 and 1050 cents.
- **F4.AC26** Given an amount of ".5" or "10.", when the user adds the expense, then no expense is saved and the user sees "Enter an amount greater than zero." next to the amount field.
- **F4.AC27** Given the expenses cannot be loaded, when the user views the trip page, then the expenses section shows "We couldn't load the expenses. Try again." and a "Try again" button, and the rest of the page is still shown. When the user chooses "Try again" and the list loads, then the expenses are listed as in F4.AC15.

## Dependencies
- **Depends on:** F1 (login and the ownership check, F1.R10), F2 (the trip and trip page, and the cascade that removes expenses with a trip, F2.R9), F3 (the people who can be payer and participants, F3.R9 reads expenses from this feature). F1, F2 and F3 must be built first.
- **Needed by:** F5 (balances, which read expenses and shares), F6 (settle-up, which uses balances).
- **Build order:** step 4 (inferred: F2 is step 2 and F3 is step 3).
- **External services:** none.

## Test plan
Unit tests only, per project-rules.md. Logic is kept where it can be tested with fakes (no database, network or running app).
- **F4.AC1** — unit test: the add-expense service with a fake expense store saves an expense on the given trip and returns it first in the list.
- **F4.AC2, F4.AC3, F4.AC4** — unit test: description validation rejects blank and over-100 descriptions after trimming, and returns the trimmed description for valid input; the fake store is never written on rejection.
- **F4.AC5, F4.AC6, F4.AC7, F4.AC24, F4.AC25, F4.AC26** — unit test: amount validation refuses zero, negative, non-numeric, comma-containing and partial (".5", "10.") input, refuses more than two digits after the decimal point, refuses above 1,000,000.00, accepts "10", "10.5" and "10.50" as 1000, 1050 and 1050 cents; the fake store is never written on rejection.
- **F4.AC8, F4.AC9** — unit test: the add-expense service refuses a missing payer and an empty participant list, and writes nothing.
- **F4.AC10** — unit test: the add-expense service accepts a payer who is not a participant.
- **F4.AC11, F4.AC12, F4.AC13, F4.AC23** — unit test: the split function returns the shares from F4.R5 for the worked examples (10.00 among 3 → 3.34, 3.33, 3.33; 90.00 among 3 → 30.00 each; 0.01 among 3 → 0.01, 0.00, 0.00; 0.05 among Alex and Jo, added after Sam but not a participant → Alex 0.03, Jo 0.02), and the shares always sum to the amount.
- **F4.AC14** — unit test: the add-expense service with a fake store saves two expenses with the same description.
- **F4.AC15** — unit test: the list service returns a trip's expenses newest first, with the later-saved expense first when added times are equal, and only that trip's expenses.
- **F4.AC16** — unit test: the delete service is not called when the confirmation is cancelled. (Dialog behaviour: code review.)
- **F4.AC17** — unit test: the delete service with a fake store removes the expense.
- **F4.AC18** — unit test: the add-expense service refuses a payer or participant who is not on the given trip, and writes nothing.
- **F4.AC19** — unit test: the removal check (F3) reports a person as in use when the fake store holds an expense where they are payer or participant.
- **F4.AC20** — unit test: the add-expense control is hidden when the trip has no people (view-model test).
- **F4.AC21** — unit test: the access check refuses a request with no session and a request for an expense on another owner's trip. Query-level scoping: code review.
- **F4.AC22** — code review: the trip delete cascade removes expenses and participant rows in the database (a unit test can only check that the delete service calls the store's cascade once; this is covered by F2.AC10).
- **Double submit on add** (Edge cases) — code review: the Save expense button is disabled while its request is in flight. This is UI behaviour; no unit test covers it.
- **Rounding of shares and the stored total** — covered by the split unit tests above (F4.AC11–AC13, AC23).

## Open questions
None.

## Decisions log
- 2026-11-19: Description: required or optional, and maximum length? → Required, maximum 100 characters after trimming (F4.R1).
- 2026-11-19: Largest amount one expense can have? → 1,000,000.00 (F4.R2). This number was suggested as the recommended option and accepted.
- 2026-11-19: Amount with more than two decimal places? → Refuse; do not round (F4.R2).
- 2026-11-19: Expense list order? → Newest first (F4.R7).
- 2026-11-19: Confirm before deleting an expense? → Yes, a confirm dialog naming the expense (F4.R9).
- 2026-11-19: Who is the payer when the form opens? → Nobody is pre-selected; the user must choose (F4.R3).
- 2026-11-19: What does each expense row show? → Description, amount, payer and date added; the split is not shown on the row (F4.R8).
- 2026-11-19: Can two expenses on one trip have the same description? → Yes (F4.R10).
- 2026-11-19: Expense date: the user enters a date? → No. The four inputs in product.md are what, how much, who paid and who shares; the date shown is the date added (Scope, F4.R8). This follows from product.md and was not asked separately.
- 2026-11-19: Thousands separators in the amount? → Refused. Only digits and one decimal point are accepted; a comma gets its own error message (F4.R2, States & errors, AC24).
- 2026-11-19: Accepted amount formats? → "10", "10.5" and "10.50" are valid, up to two digits after the decimal point (F4.R2, AC25, Edge cases).
- 2026-11-19: Same added time, which expense is listed first? → The one saved later is listed first (F4.R7, Edge cases, AC15 test).
- 2026-11-19: Leftover cents among participants? → Given to participants only, in the order added to the trip, earliest first. A worked case with a non-participant was added as AC23 (F4.R5, AC13 wording).
- 2026-11-19: Copy for all messages? → Approved as written in States & errors, including the labels, buttons, dialog and in-flight labels.
- 2026-11-19: Partial amounts (".5", "10.")? → Refused; a decimal point needs a digit on both sides (F4.R2, AC26, Edge cases).
- 2026-11-19: Product.md edits? → None. Limits and rules are recorded in this spec's Decisions log only, as the user asked.
- 2026-11-19: Approve F4? → Yes. Status set to Approved. Open questions cleared.
- 2026-11-19: Plan review (sent back, one item): what does the expenses section show when it fails to load? → "We couldn't load the expenses. Try again." with a "Try again" button, same as F2 and F3. Added to States & errors and as F4.AC27. No other change to the spec. Recorded in the plan's open item; the plan needs re-running (`/plan-feature F4`) to map AC27.
- 2026-11-19: Re-approval of F4 after the change above. Status remains Approved. The earlier approval (2026-11-19) covered the spec before this change; this one covers the spec with F4.AC27.
