# F2 — Trips

_Status: Approved · Last updated: 2026-11-19 · Source: product.md › MVP scope (F2), Roles, Key terms, Business rules (R8), Assumptions; F1 spec (trip pages, OQ3)_

## Summary
A logged-in user creates a trip by giving it a name, sees a list of their own trips, opens one trip to see its page, and deletes a trip they no longer need. Trips are the container for everything else: people (F3), expenses (F4), balances (F5) and settle-up (F6). This feature makes sure each user sees and changes only their own trips.

## User stories
- As a user, I want to create a trip with a name, so that I can start tracking a trip's shared spending.
- As a user, I want to see a list of my trips, so that I can find the one I need.
- As a user, I want to open a trip, so that I can work on it.
- As a user, I want to delete a trip after confirming, so that I can remove a trip I no longer need.

## Scope
**In:** Create a trip with a name; trips list (only the logged-in user's trips); trip page showing the trip name, with a delete action; delete a trip and everything in it, after confirmation; the ownership check on every trip endpoint added here (the check itself is built in F1.R10).
**Out:**
- Adding or removing people on the trip page — F3.
- Expenses, balances and settle-up on the trip page — F4, F5, F6.
- Editing a trip's name — product.md › Assumptions (no editing).
- Trip dates, currency, notes or other fields — product.md › Assumptions (one currency); not in product.md, so not built (see Decisions log).
- Sharing a trip with another user — product.md › After the core.
- Undo or recovery after delete — see Decisions log.

## User flow & screens
1. **Trips list (landing page):** after login, the user lands here (F1 OQ3, resolved in Decisions log). It shows the user's trips, newest first. If there are none, the empty state is shown.
2. **Create trip:** the user chooses Create trip (from the list, including the empty state's button), types a name, and submits. On success, the trip is created and the user is taken to its trip page.
3. **Trip page:** shows the trip name and a Delete trip button. Later features add their sections to this page.
4. **Delete trip:** the user chooses Delete trip on the trip page. A confirm dialog opens, naming the trip and saying that its people and expenses will be removed too. Confirm deletes the trip and returns the user to the trips list. Cancel closes the dialog and changes nothing.
5. **Open a trip not theirs or deleted:** the user is shown a not-found page (see States & errors); no trip data is shown.

Mock screens: none found in `docs/design`. Screens needed: Trips list (with empty state), Create trip, Trip page, Delete confirm dialog.

## Requirements
- **F2.R1** A trip has a name. The name is required.
- **F2.R2** Before the name is checked and saved, leading and trailing spaces are removed. A name that is blank after trimming is refused.
- **F2.R3** A trip name is at most 100 characters, counted after trimming.
- **F2.R4** Two trips owned by the same user may have the same name. Names are labels only; the created date tells them apart in the list.
- **F2.R5** A trip is created for the logged-in user and is owned by that user. Ownership is set by the server, never taken from the request.
- **F2.R6** The trips list shows only trips owned by the logged-in user, newest first (by created date).
- **F2.R7** Each row in the trips list shows the trip name and the date the trip was created, formatted as "18 Nov 2026" in the user's local time zone. The format is the same for every user; it does not depend on locale. The date is stored in UTC and converted to local time for display only.
- **F2.R8** The trip page shows only for a trip owned by the logged-in user. Any other trip is treated as not found (F1.R10).
- **F2.R9** Deleting a trip removes the trip and everything in it: its people, expenses and payments (product.md › R8). Deletion happens only after the user confirms in the dialog.
- **F2.R10** Deletion is permanent. There is no undo or recovery.
- **F2.R11** Every trip endpoint added in F2 requires a logged-in user and checks ownership, as F1.R10 requires.
- **F2.R12** Trips have no edit action. A name cannot be changed after creation (product.md › Assumptions).

## Data & contract
- **Trip record** (new): `id`, `owner_id` (references the user), `name` (required, 1–100 characters after trimming), `created_at` (UTC). Derived from F2.R1–R5, R7, and product.md › Key terms. Times are stored in UTC (project-rules.md).
- **Relationships:** each trip has many people, expenses and payments (added in F3–F6). Deleting a trip removes all of them (F2.R9). The cascade is enforced by the database or the delete operation, which the plan sets.
- **Operations needed:** list the user's trips, create a trip, get one trip for the user, delete one trip for the user. Each takes the user from the session (F1), never from the request body or URL alone.
- **Exact routes, request and response bodies, and error shapes:** set in the plan, after the stack is chosen. The not-found response for another user's trip must be the same as the response for a trip that does not exist (F2.R8, F1.R10).
- **Browser storage:** none beyond the session (F1).

## States & errors
The copy below is final as approved on 2026-11-19. Each state's meaning is fixed by the requirements.
- **Trips list, loading:** a loading indicator is shown while trips are fetched. Copy: "Loading your trips…"
- **Trips list, empty:** a short message and a Create trip button. Copy: "You have no trips yet." Button: "Create trip".
- **Trips list, loaded:** rows as in F2.R7, newest first.
- **Trips list, failed to load:** the list request failed. Copy: "We couldn't load your trips. Try again." Button: "Try again", which fetches the list again and shows the loading state while it does. No trips are shown with the message.
- **Create trip, name blank after trimming:** shown next to the field; the trip is not created (F2.R2). Copy: "Enter a trip name."
- **Create trip, name longer than 100 characters:** shown next to the field; the trip is not created (F2.R3). Copy: "Trip names can be up to 100 characters."
- **Create trip, request failed:** the user is told the trip was not saved and can try again; the typed name is kept. Copy: "We couldn't save your trip. Try again."
- **Trip page, not found or not yours:** the same not-found page for both cases (F2.R8). Heading: "Trip not found." Body: "We couldn't find that trip." Button: "Back to trips".
- **Trip page, loading:** the trip is being fetched. Copy: "Loading trip…"
- **Trip page, failed to load:** the trip request failed for a reason other than not-found (F2.R8). Copy: "We couldn't load this trip. Try again." Button: "Try again", which fetches the trip again and shows the loading state while it does.
- **Delete dialog:** names the trip and states that its people and expenses will be removed (F2.R9). Title: "Delete [trip name]?" Body: "This removes the trip and all its people, expenses and payments. This can't be undone." Buttons: "Delete trip" and "Cancel".
- **Delete, request failed:** the user is told the trip was not deleted; the trip stays on the list. Copy: "We couldn't delete this trip. Try again."
- **Loading on submit:** the Create and Delete buttons are disabled while their request is in flight, so a normal double click sends one request. Labels while in flight: "Saving…" (Create) and "Deleting…" (Delete).

## Accessibility
- The create form's name field has a visible label; errors are linked to the field and announced to screen readers.
- The trips list is a list of links, one per trip, that can be reached and opened with the keyboard.
- The delete dialog traps focus while open, puts focus on the dialog's first action, and returns focus to the Delete trip button when closed. Escape closes it (same as Cancel).
- The destructive action in the dialog is labelled clearly (for example "Delete trip"), not only by colour.
- Contrast and focus styles follow the app's theme once the stack is chosen.
- No motion is used beyond a loading indicator; reduced-motion rules apply to any animation added.

## Edge cases
- Name of only spaces: refused as blank (F2.R2).
- Name with 100 characters after trimming: accepted. 101: refused (F2.R3).
- Name with leading or trailing spaces: saved trimmed (F2.R2). Name with spaces inside it: kept as typed.
- Two trips with the same name for one user: both allowed (F2.R4); they appear as two rows with different created dates.
- Two trips with the same name for two different users: both allowed; users never see each other's trips.
- Double submit on create: the button is disabled while the request is in flight, so a normal double click sends one request. product.md does not require server-side de-duplication, so a second request that gets through would create a second trip (see Test plan).
- Double submit on delete: the second request finds no trip and is treated as not found; no error is shown to the user beyond the list update.
- Opening a trip URL for a trip owned by another user: not-found page, same as a missing trip (F2.R8).
- Deleting a trip in another tab that is still open here: the next action on it shows not-found.
- Trip with no people or expenses yet: deletes the same way (F2.R9).
- Delete cancelled: nothing changes.
- Trips list or trip page fails to load, then Try again succeeds: the content is shown and the error message is removed (F2.AC15, F2.AC16).

## Acceptance criteria
- **F2.AC1** Given a logged-in user, when they submit a trip name of 1–100 characters that is not blank, then a trip is created, owned by them, and they are taken to its trip page.
- **F2.AC2** Given a name that is blank or only spaces, when the user submits it, then no trip is created and the user sees a message next to the field.
- **F2.AC3** Given a name of more than 100 characters after trimming, when the user submits it, then no trip is created and the user sees a message next to the field.
- **F2.AC4** Given a name with leading or trailing spaces, when the user submits it, then the saved name has those spaces removed.
- **F2.AC5** Given a user who already has a trip called "Lisbon", when they create another trip called "Lisbon", then both trips are saved and both appear in the list.
- **F2.AC6** Given a logged-in user with several trips, when they open the trips list, then only their own trips are shown, newest first, each with its name and created date.
- **F2.AC7** Given a logged-in user with no trips, when they open the trips list, then the empty state with a Create trip button is shown.
- **F2.AC8** Given a logged-in user, when they open the trip page for a trip owned by another user, or for a trip that does not exist, then the same not-found page is shown and no trip data is returned.
- **F2.AC9** Given a logged-in user on a trip page, when they choose Delete trip and then Cancel, then the trip and its contents are unchanged.
- **F2.AC10** Given a logged-in user on a trip page, when they choose Delete trip and then confirm, then the trip and all its people, expenses and payments are removed, and the user is returned to the trips list without that trip.
- **F2.AC11** Given a deleted trip, when anyone requests it, then the response is the same not-found response as for a trip that never existed.
- **F2.AC12** Given a logged-out visitor, when they call any trip endpoint added in F2, then the request is refused and no trip data is returned (F1.R10).
- **F2.AC13** Given a trip owned by user A, when user B calls any trip endpoint for it, then the request is refused and no trip data is returned (F1.R10).
- **F2.AC14** Given a user who logs in with no trip page requested, when login succeeds, then they land on the trips list.
- **F2.AC15** Given a logged-in user, when the trips list cannot be loaded, then "We couldn't load your trips. Try again." and a Try again button are shown; when the user chooses Try again and the request succeeds, then their trips are shown in place of the message.
- **F2.AC16** Given a logged-in user, when the trip page is waiting for its trip, then "Loading trip…" is shown; when the trip request fails for a reason other than not-found, then "We couldn't load this trip. Try again." and a Try again button are shown, and choosing Try again fetches the trip again.

## Dependencies
- **Depends on:** F1 (login, session, and the ownership check in F1.R10). F1 must be built first.
- **Needed by:** F3 (people on a trip), F4 (expenses), F5 (balances), F6 (settle up). All of them hang off the trip page and the trip record.
- **Build order:** step 2.
- **External services:** none.

## Test plan
Unit tests only, per project-rules.md. Logic is kept where it can be tested with fakes (no database, network or running app).
- **F2.AC1** — unit test: the create-trip service with a fake trip store creates a trip owned by the given user.
- **F2.AC2, F2.AC3, F2.AC4** — unit test: name validation rejects blank and over-100 names after trimming, and returns the trimmed name for valid input; the fake store is never written on rejection.
- **F2.AC5** — unit test: the create-trip service with a fake store that already has "Lisbon" for the user still creates the second trip.
- **F2.AC6, F2.AC7** — unit test: the list service with a fake store returns only the given user's trips, sorted newest first; an empty result maps to the empty state.
- **F2.AC8, F2.AC11** — unit test: the get-trip service with a fake store returns the same not-found result for another user's trip and for a missing trip.
- **F2.AC9** — unit test: the delete service is not called when the confirmation is cancelled. (Dialog behaviour: code review.)
- **F2.AC10** — code review: the cascade removes people, expenses and payments in the database. A unit test can only check that the delete service calls the store's cascade delete once.
- **F2.AC12, F2.AC13** — code review: every trip query and mutation scopes by the session user's id (the database query itself cannot be proven by a unit test). Unit test: the access check refuses a request with no session and a request for another owner's trip id.
- **F2.AC14** — unit test: the post-login redirect target is the trips list when no return target is set.
- **F2.AC15, F2.AC16** — unit test: the view-model functions in `domain/` pick the loading, failed and loaded states, and the failure and loading copy matches the approved text. The Try again re-fetch: code review (UI behaviour).
- **Double submit on create** (edge case) — code review: the Create button is disabled while its request is in flight (States & errors). This is UI behaviour; no unit test covers it.

## Open questions
None.

## Decisions log
- 2026-11-18: Can two of your trips have the same name? → Yes, duplicates allowed (F2.R4).
- 2026-11-18: What does a trip need when created, besides a name? → Name only. No dates, currency or notes (Scope, Data & contract).
- 2026-11-18: How should the trips list be ordered, and what does each row show? → Newest first; each row shows name and created date (F2.R6, F2.R7).
- 2026-11-18: After creating a trip, where does the user go, and is there a trip page yet? → A trip page with the name and a Delete action; it is a shell until F3–F6 add to it (User flow, F2.R8).
- 2026-11-18: Trip name limits? → Required, max 100 characters (F2.R1, F2.R3). The 100 was proposed as the recommended option and accepted.
- 2026-11-18: Where do logged-in users land? → The trips list (AC14). Resolves F1 OQ3; F1 is already approved with this landing page.
- 2026-11-18: Empty trips list? → Short message plus a Create trip button. Wording set on 2026-11-19 (see below).
- 2026-11-18: How is deleting confirmed? → A confirm dialog naming the trip (F2.R9, User flow).
- 2026-11-18: Trim leading and trailing spaces in the trip name? → Yes, then refuse a blank name (F2.R2).
- 2026-11-18: Undo for deleted trips? → No undo; delete is permanent (F2.R10).
- 2026-11-19: Copy for empty state and all messages (OQ1, OQ2)? → Draft copy written in States & errors, to be shown to the user for approval before it is final.
- 2026-11-19: Created date format? → "18 Nov 2026", in the user's local time zone; same format for everyone, not locale-based (F2.R7). Resolves former OQ3.
- 2026-11-19: Delete on trip-list rows as well as the trip page? → Trip page only (User flow, F2.R8). Resolves former OQ4.
- 2026-11-19: Double submit on create — how is it prevented? → Button disabled in flight only; no server-side de-duplication required by product.md. Edge case and Test plan updated to match.
- 2026-11-19: F1 landing-page dependency line removed from F2 Dependencies; F1 is already approved and sets the trips list as the landing page.
- 2026-11-19: Approve the draft copy (OQ1)? → Yes, the copy in States & errors is approved as written. Open questions cleared.
- 2026-11-19: Approve F2? → Yes. Status set to Approved.
- 2026-11-19: Trips list fails to load (plan question, sent back)? → Show "We couldn't load your trips. Try again." with a "Try again" button that fetches the list again (States & errors, F2.AC15).
- 2026-11-19: Trip page while loading? → Show "Loading trip…" (States & errors, F2.AC16).
- 2026-11-19: Trip page fails to load for a reason other than not-found? → Show "We couldn't load this trip. Try again." with a "Try again" button that fetches the trip again (States & errors, F2.AC16).
- 2026-11-19: Status set back to Draft for re-approval after these additions. Substance changed in an Approved spec, so `docs/plans/F2-trips.md` may be out of date (its Sent back to spec items are answered by these entries).
- 2026-11-19: Re-approve F2 as written (F2.AC15 and F2.AC16 added, with their copy in States & errors)? → Yes. Status set to Approved again.
