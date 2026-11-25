# F3 — People

_Status: Approved · Last updated: 2026-11-19 · Source: product.md › MVP scope (F3), Key terms (Person), Business rules (R2, R3, R7), Assumptions (no accounts, no editing); F2 spec (trip page, F2.R9)_

## Summary
A user adds the people who are on a trip, by name, and removes a person who should not be there. People are names only; they have no accounts and cannot log in. A person who is part of any expense or payment cannot be removed, so the balances and suggested payments stay correct. This feature adds the people section to the trip page built in F2. Expenses (F4) and settle-up (F6) use the people added here.

## User stories
- As a user, I want to add the people on a trip by name, so that I can later record who paid and who shares each expense.
- As a user, I want to remove a person I added by mistake, so that they are not on the trip.
- As a user, I want to be told why a person cannot be removed, so that I know the removal did not fail for no reason.

## Scope
**In:** Add a person to a trip by name; list the trip's people; remove a person after confirmation; the rule that a person in any expense or payment cannot be removed; the login and ownership check on every people endpoint (F1.R10).
**Out:**
- Editing a person's name — product.md › Assumptions (no editing). A mistake is fixed by removing and adding again.
- People with accounts, or sharing a trip with them — product.md › Assumptions and After the core.
- Adding or choosing people inside an expense — F4.
- Expense and payment records that make a person "in use" — F4 and F6. This feature builds the check; it reads those records once they exist.
- Trip deletion removes all people — F2.R9 (already specified).

## User flow & screens
1. **Trip page, people section:** the trip page (F2) shows a People section. It lists the trip's people in the order they were added, oldest first (F3.R6).
2. **Add a person:** the user types a name in the add-person field and submits. On success, the person is added to the end of the list and the field is cleared.
3. **Remove a person:** the user chooses Remove next to a person. A confirm dialog opens, naming the person. Confirm removes them. Cancel closes the dialog and changes nothing.
4. **Remove refused:** if the person is in any expense or payment, the removal is refused and the message is shown. The person stays on the list.

Mock screens: none found in `docs/design`. Screens needed: Trip page people section (with empty state), Remove confirm dialog.

## Requirements
- **F3.R1** A person has a name. The name is required.
- **F3.R2** Before the name is checked and saved, leading and trailing spaces are removed. A name that is blank after trimming is refused.
- **F3.R3** A person's name is at most 50 characters, counted after trimming.
- **F3.R4** A name must be unique within its trip. Names are stored as typed, with their capitals kept, and compared without regard to capital letters, so "Sam" and "sam" are the same name on one trip. A name that is already on the trip is refused, and no person is created. The same name may be used on a different trip (product.md › Key terms).
- **F3.R5** A trip has no limit on the number of people.
- **F3.R6** People are listed in the order they were added, oldest first. That order is also the order used for leftover cents (product.md › R3).
- **F3.R7** A person's name cannot be changed after they are added (product.md › Assumptions).
- **F3.R8** Removing a person asks for confirmation first. Confirm removes the person; Cancel changes nothing (decided).
- **F3.R9** A person cannot be removed while they are in any expense (as payer or as a participant) or in any payment (as payer or payee). The removal is refused, the person stays, and the user is told why (product.md › R7, R2).
- **F3.R10** Removing a person is permanent. There is no undo, since a mistake is fixed by adding the person again (product.md › Assumptions).
- **F3.R11** Every people endpoint requires a logged-in user and checks that the trip belongs to that user, as F1.R10 requires. A request that fails either check is refused with no people data returned.

## Data & contract
- **Person record** (new): `id`, `trip_id` (references the trip), `name` (required, 1–50 characters after trimming), `added_at` (UTC), and an ordering value that keeps people in the order they were added (F3.R6). Derived from product.md › Key terms, R3 and R7, and F3.R1–R6. Times are stored in UTC (project-rules.md).
- **Constraints:** `name` is unique within `trip_id`, compared without regard to capital letters (F3.R4). A duplicate is refused even when two requests arrive at the same time; how that is enforced is set in the plan.
- **Relationships:** a person belongs to one trip. Deleting a trip removes its people (F2.R9). A person is referenced by expenses and payments (F4, F6); the removal check (F3.R9) reads those references.
- **Operations needed:** list a trip's people, add a person to a trip, remove a person from a trip, and the "is this person in use?" check used by removal. Each takes the user from the session (F1), never from the request body or URL alone.
- **Exact routes, request and response bodies, and error shapes:** set in the plan, after the stack is chosen. The not-found response for a person on another user's trip must match the response for a trip that does not exist (F2.R8).
- **Browser storage:** none beyond the session (F1).

## States & errors
- **People section, heading and form copy:** the section heading is "People". The add-person field label is "Person name". The add button is "Add".
- **People section, loading:** a loading indicator is shown while people are fetched. Copy: "Loading people…"
- **People section, failed to load:** the list is replaced by a message and a "Try again" button; activating it fetches the people again (F3.AC15). Copy: "We couldn't load the people. Try again."
- **People section, empty:** a short message and the add-person field. Copy: "No people yet. Add the people on this trip."
- **People section, loaded:** one row per person, in the order added (F3.R6), each with a Remove action.
- **Add person, name blank after trimming:** shown next to the field; no person is added (F3.R2). Copy: "Enter a name."
- **Add person, name longer than 50 characters:** shown next to the field; no person is added (F3.R3). Copy: "Names can be up to 50 characters."
- **Add person, name already on this trip:** shown next to the field; no person is added; the typed name is kept (F3.R4). The [Name] in the message is the existing person's name as stored on the trip, not what the user typed (so typing "sam " shows "Sam"). Copy: "[Name] is already on this trip."
- **Add person, request failed:** the user is told the person was not added and can try again; the typed name is kept. Copy: "We couldn't add this person. Try again."
- **Remove dialog:** names the person (F3.R8). Title: "Remove [name]?" Body: "They will be removed from this trip. This can't be undone." Buttons: "Remove" and "Cancel".
- **Remove refused, person in an expense or payment:** the message is shown and the person stays on the list (F3.R9). Copy: "This person is in an expense or payment, so they can't be removed." (approved)
- **Remove, request failed:** the user is told the person was not removed; the person stays on the list. Copy: "We couldn't remove this person. Try again."
- **Loading on submit:** the Add and Remove buttons are disabled while their request is in flight, so a normal double click sends one request. Labels in flight: "Adding…" (Add) and "Removing…" (Remove).

## Accessibility
- The add-person field has a visible label. Errors are linked to the field and announced to screen readers.
- Each person's Remove action names the person for screen readers (for example "Remove Sam"), so it is not just "Remove" repeated.
- The remove dialog traps focus while open, puts focus on its first action, returns focus to the Remove button that opened it when closed, and closes on Escape (same as Cancel). This follows F2.
- The destructive action in the dialog is labelled clearly (for example "Remove [name]"), not only by colour.
- Everything is reachable and operable with the keyboard only.
- Contrast and focus styles follow the app's theme once the stack is chosen.
- No motion is used beyond a loading indicator; reduced-motion rules apply to any animation added.

## Edge cases
- Name of only spaces: refused as blank (F3.R2).
- Name of 50 characters after trimming: accepted. 51: refused (F3.R3).
- Name with leading or trailing spaces: saved trimmed (F3.R2). Spaces inside a name are kept as typed.
- "Sam" already on the trip, then "sam " typed: refused as a duplicate (F3.R4).
- "Sam" on trip A and "Sam" on trip B: both allowed; each trip has its own list.
- Two people with names that differ only in capitals, added at the same moment: at most one is saved (F3.R4).
- Double submit on add: the button is disabled while the request is in flight. If a second request gets through, the duplicate is still refused (F3.R4).
- Remove a person who is the payer of an expense: refused (F3.R9).
- Remove a person who is only in a suggested payment, not yet marked paid: allowed. Only expenses and payments the user has recorded count as "in use" (product.md › Key terms: Payment means a suggested payment marked as paid).
- Remove a person in another tab after they were already removed: the removal finds no person and is treated as not found; no message is shown and the list is refreshed, so the person disappears (F3.AC16).
- Remove, then add the same name again: allowed, since the person is no longer on the trip. The new person is added at the end of the list.
- Cancel the remove dialog: nothing changes.
- Trip with many people: no cap (F3.R5); the list still shows them in the order added.

## Acceptance criteria
- **F3.AC1** Given a logged-in user on a trip they own, when they add a name that is not blank and is 1–50 characters after trimming, then the person is saved on that trip and listed last.
- **F3.AC2** Given a name that is blank or only spaces, when the user adds it, then no person is added and the user sees a message next to the field.
- **F3.AC3** Given a name of more than 50 characters after trimming, when the user adds it, then no person is added and the user sees a message next to the field.
- **F3.AC4** Given a name with leading or trailing spaces, when the user adds it, then the saved name has those spaces removed.
- **F3.AC5** Given a trip that already has "Sam", when the user adds "sam" or "Sam " to that trip, then no person is added and the user sees "Sam is already on this trip." (the existing name as stored, not what was typed)
- **F3.AC6** Given two different trips owned by one user, when "Sam" is added to each, then both are saved.
- **F3.AC7** Given a trip with several people, when the user views the trip page, then the people are listed oldest first (in the order added).
- **F3.AC8** Given a user who chooses Remove on a person, when they choose Cancel, then the person and the trip are unchanged.
- **F3.AC9** Given a person who is in no expense or payment, when the user chooses Remove and then confirms, then the person is removed and no longer listed.
- **F3.AC10** Given a person who is the payer or a participant in an expense, when the user chooses Remove and confirms, then the removal is refused, the person stays on the list, and the message "This person is in an expense or payment, so they can't be removed." is shown.
- **F3.AC11** Given a person who is the payer or payee of a payment, when the user chooses Remove and confirms, then the removal is refused, the person stays, and the same message is shown.
- **F3.AC12** Given a trip with any number of people, when another person is added, then the person is saved (no cap).
- **F3.AC13** Given a logged-out visitor, or a logged-in user acting on a trip they do not own, when they call any people endpoint, then the request is refused and no people data is returned (F1.R10).
- **F3.AC14** Given a person on a trip, when the user views the trip, then there is no action to change the person's name.
- **F3.AC15** Given the people list cannot be loaded, when the trip page is shown, then the message "We couldn't load the people. Try again." and a "Try again" button are shown, and activating the button fetches the people again.
- **F3.AC16** Given a person removed in another tab, when the user chooses Remove and confirms in this tab, then no message is shown, the person is not listed after the list refreshes, and no other person is changed.

## Dependencies
- **Depends on:** F1 (login and the ownership check, F1.R10) and F2 (the trip and trip page, and the cascade that removes people with a trip, F2.R9). F1 and F2 must be built first.
- **Needed by:** F4 (expenses choose payers and participants from these people), F5 (balances), F6 (settle up). Removal check (F3.R9) reads expense and payment records from F4 and F6.
- **Build order:** step 3.
- **External services:** none.

## Test plan
Unit tests only, per project-rules.md. Logic is kept where it can be tested with fakes (no database, network or running app).
- **F3.AC1, F3.AC4** — unit test: the add-person service with a fake people store adds the person at the end of the trip's list, with the name trimmed.
- **F3.AC2, F3.AC3** — unit test: name validation rejects a blank name and a name over 50 characters after trimming; the fake store is never written on rejection.
- **F3.AC5** — unit test: the add-person service with a fake store that already has "Sam" on the trip refuses "sam" and "Sam " and writes nothing.
- **F3.AC6** — unit test: the add-person service with a fake store adds "Sam" to a second trip while "Sam" exists on the first.
- **F3.AC7** — unit test: the list service returns the trip's people in the order added.
- **F3.AC8** — unit test: the remove service is not called when the confirmation is cancelled. (Dialog behaviour: code review.)
- **F3.AC9** — unit test: the remove service with a fake in-use check returning false removes the person from the store.
- **F3.AC10, F3.AC11** — unit test: the remove service with a fake in-use check returning true (as payer, participant, or payment party) refuses the removal and leaves the store unchanged.
- **F3.AC12** — unit test: the add-person service with a fake store adds a person when the trip already has many people.
- **F3.AC13** — unit test: the access check refuses a request with no session and a request for a person on another owner's trip. Query-level scoping: code review.
- **F3.AC14** — code review: no edit action for a person's name exists in the trip page or the people endpoints.
- **F3.AC15** — unit test: the list service returns a failure result, not a partial list, when the fake store throws; the trip page's message and retry button are code review.
- **F3.AC16** — unit test: the remove service with a fake store that has no such person returns the not-found result and writes nothing; no-message and list refresh are code review.
- **Duplicate at the same time** (F3.R4, Edge cases) — code review: a duplicate is refused even when two requests arrive at the same time; how this is enforced is set in the plan. A unit test cannot prove it.
- **Double submit on add** (Edge cases) — code review: the Add button is disabled while its request is in flight. This is UI behaviour; no unit test covers it.
- **Cascade on trip delete** (F2.R9) — covered by F2; no new test here.

## Open questions
None.

## Decisions log
- 2026-11-19: Name rules (trim, maximum length, uniqueness) → Trim, maximum 50 characters after trimming, unique within the trip ignoring capital letters (F3.R2, R3, R4).
- 2026-11-19: Maximum number of people on one trip? → No limit (F3.R5).
- 2026-11-19: Order on the trip page? → Order added, oldest first. This matches the leftover-cents order in product.md R3 (F3.R6).
- 2026-11-19: Confirm before removing a person? → Yes, a confirm dialog naming the person; Cancel changes nothing (F3.R8).
- 2026-11-19: Message when a person cannot be removed? → "This person is in an expense or payment, so they can't be removed." (F3.R9, AC10).
- 2026-11-19: Message when a name is already on the trip? → "[Name] is already on this trip." (F3.R4, AC5).
- 2026-11-19: Stored capitals? → Store the name as typed; compare ignoring capitals (F3.R4).
- 2026-11-19: Copy approval → User approved all copy as written: empty state "No people yet. Add the people on this trip."; "Enter a name."; "Names can be up to 50 characters."; "We couldn't add this person. Try again."; remove dialog (Title "Remove [name]?", Body "They will be removed from this trip. This can't be undone.", Buttons "Remove" and "Cancel"); "We couldn't remove this person. Try again."; in-flight labels "Adding…" and "Removing…". Loading state: "Loading people…" (User specified).
- 2026-11-19: Duplicate-name message [Name] → the existing person's name as stored, not the typed name (States & errors, AC5).
- 2026-11-19: Database enforcement of the duplicate rule → Removed from the spec; the spec now requires only that a duplicate is refused under concurrent requests, and the plan sets how (Data & contract, Test plan).
- 2026-11-19: Approve F3? → Yes. Status set to Approved.
- 2026-11-19: Re-approval after revision. Changes: added the copy for the section heading ("People"), field label ("Person name") and button ("Add") (States & errors); added the failed-to-load state with "We couldn't load the people. Try again." and a "Try again" button (States & errors, F3.AC15); removing an already-removed person shows no message and refreshes the list (Edge cases, F3.AC16). Nothing else changed. Status set to Draft while edited, then Approved again on the user's approval. The plan at docs/plans/F3-people.md predates these changes and must be updated before building.
