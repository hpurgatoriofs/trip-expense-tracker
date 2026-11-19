# F5 — Balances

_Status: Approved · Last updated: 2026-11-19 · Source: product.md › Goals (balances always correct and add up to zero), Assumptions (whole cents, equal splits), Key terms (Balance), Business rules (R3, R4, R5), MVP scope (F5), Worked examples (1, 2, 3); F1 spec (F1.R10); F2 spec (F2.R8); F3 spec (F3.R6); F4 spec (F4.R2, F4.R5, F4.R8, F4.R14)_

## Summary
The trip page shows each person's balance: how much they are owed, or how much they owe, for the whole trip. A balance is what the person paid, minus their share of every expense, adjusted by payments. The balances on a trip always add up to exactly zero, so the numbers show who should receive money and who should pay it. This feature adds a balances section to the trip page built in F2, reading the people from F3 and the expenses from F4. Settle-up (F6) reads these balances to suggest payments.

## User stories
- As a user, I want to see what each person is owed or owes on the trip, so that I know who should pay whom.
- As a user, I want a person with nothing owed either way to show as settled, so that I don't have to work out a zero.
- As a user, I want balances to update when I add or delete an expense, so that the numbers always match the expenses.

## Scope
**In:** A balances section on the trip page; one balance per person on the trip, calculated with product.md R4; the "is owed" / "owes" / "is settled" display; the rule that all balances add up to zero (R5); the login and ownership check on the balances endpoint.
**Out:**
- Suggested payments and marking them paid — F6.
- Showing the paid and share totals behind each balance — not chosen for this feature (Decisions log). A user can check a balance from the expenses on the page.
- Editing balances. Balances are calculated, never typed in (product.md › Assumptions, no editing).
- Currency conversion and per-person currency — product.md › After the core (out of scope).

## User flow & screens
1. The user opens a trip from the trips list (F2). The trip page shows the trip name, the People section (F3), then the Expenses section (F4), then the **Balances** section.
2. The Balances section lists one row per person on the trip, in the order they were added (F5.R7). Each row shows the person's name and their balance: "[Name] is owed [amount]", "[Name] owes [amount]", or "[Name] is settled".
3. The user adds or deletes an expense in the Expenses section. When the page next shows balances, the rows reflect the change (F5.R9).
4. The section is read-only. It has no buttons.

Screen names: trip page (F2), Balances section (this feature). No mock screens are on `docs/design`; the placement follows the sections already built in F3 and F4.

## Requirements
- **F5.R1** Each person on a trip has exactly one balance. The balance = what the person paid − their shares of all expenses + payments they made − payments they received (product.md › R4).
- **F5.R2** A person's share of an expense is the share calculated by F4.R5 for that expense. Balances use the same shares that F4 defines; the calculation is not repeated with different rules.
- **F5.R3** Balances are whole numbers of cents. No rounding is applied when balances are calculated. Any rounding happens once, in the share calculation (F4.R5).
- **F5.R4** A positive balance is shown as "[Name] is owed [amount]". A negative balance is shown as "[Name] owes [amount]", with the amount shown as a positive number (product.md › Key terms). Amounts are shown with exactly two digits after the decimal point, with thousands separators between groups of three digits, and no currency symbol (e.g. "1,250.00"). The format is the same as the money formatter in the approved F4 plan (`formatCents`, F4 plan T1). Amounts are typed with digits and one decimal point only, with no separators (F4.R2). Product.md › Assumptions gives one currency.
- **F5.R5** A balance of exactly zero is shown as "[Name] is settled" (lowercase "settled"), with no amount.
- **F5.R6** The balances of all people on a trip add up to exactly zero (product.md › R5). This is an invariant of the calculation, checked by tests (Test plan), not a user-facing check.
- **F5.R7** The Balances section lists every person on the trip, in the order they were added, oldest first (F3.R6). Each row shows only the person's name and their balance (F5.R4 and F5.R5).
- **F5.R8** A person with no expenses and no payments has a balance of zero and is shown as "is settled" (F5.R5). A person in an expense is never left out of the section.
- **F5.R9** Balances are calculated from the trip's current people, expenses and payments each time they are requested. They are not typed in, edited or saved as separate values, so they match the expenses on the page (product.md › Goals, "always correct").
- **F5.R10** Balances are read-only. The section has no edit, delete or add action (product.md › Assumptions).
- **F5.R11** The balances request requires a logged-in user and checks that the trip belongs to that user, as F1.R10 requires. A request that fails either check is refused with no balance data returned. A trip owned by another user is treated as not found (F2.R8).
- **F5.R12** The balance calculation takes the trip's payments as an input and includes them in the formula in F5.R1 (product.md › R4). F5 creates no payments; payments are created in F6. Until F6 exists, the live trip has no payments, so the payments term is zero. The calculation is tested with a fake payment (F5.AC8), so F5 does not wait for F6.

## Data & contract
- **No new stored data.** Balances are calculated from the existing records: person (F3), expense and expense participants (F4). Payments are an input to the calculation (F5.R12); F5 adds no payments table or payment rows.
- **Operation needed:** get the balances of one trip, for the logged-in user. The user comes from the session (F1), never from the request body or URL alone (as F4 requires).
- **Response shape:** one entry per person, in the order added (F5.R7). Each entry: the person's name, and the balance in cents as a whole number (F5.R3). The sign of the balance decides "is owed" or "owes" (F5.R4). The exact route and field names are set in the plan, after the stack is chosen.
- **Not-found response:** for a trip owned by another user, the response must match the response for a trip that does not exist (F5.R11, F2.R8).
- **Browser storage:** none beyond the session (F1).

## States & errors
Copy below is approved as written (2026-11-19). The meaning of each state is fixed by the requirements.
- **Balances section, loading:** a loading indicator is shown while balances are fetched. Copy: "Loading balances…"
- **Balances section, loaded:** one row per person (F5.R7). Rows show "[Name] is owed [amount]", "[Name] owes [amount]", or "[Name] is settled" (F5.R4, F5.R5).
- **Balances section, empty, trip has no people:** no rows. Copy: "Add people to see balances."
- **Balances section, all people settled:** every row shows "is settled" (F5.R5). No separate message.
- **Balances request failed:** the section shows an error and the rest of the trip page still works. Copy: "We couldn't load balances. Try again."
- **Labels:** section heading: "Balances".

## Accessibility
- Balances are shown as words ("is owed", "owes", "is settled") as well as the amount. The meaning does not rely on colour (F5.R4).
- Each row is one text unit that a screen reader reads in full, with the name first.
- The section heading uses the same heading level as the Expenses section (F4), so the page structure is consistent.
- The section has no interactive controls, so keyboard and focus handling need no changes beyond the trip page (F2).
- Reduced motion: no animation is added by this feature.

## Edge cases
- A trip with one person: the only person can be the payer and the only participant of an expense (F4.R4 needs one participant, and the payer may be a participant). Their paid amount equals their share, so the balance is zero and shown as "is settled" (F5.R5).
- An expense where the payer is not a participant: the payer is owed the full amount; the participants owe their shares (product.md › R2; AC4).
- A person who is only the payer of every expense: they are owed the total of expenses they paid, minus their own shares (AC1).
- Amounts that do not divide evenly: leftover cents are already in each person's share (F4.R5), so the balances still add up to zero (AC3).
- Deleting an expense: the balances change the next time they are requested (F5.R9). A deleted expense leaves no balance behind.
- A person added after expenses exist: they have no shares or payments, so they show as "is settled" until they appear in an expense (F5.R8).
- A large balance: the amount is the sum of whole cents, so it is never rounded. It is shown with thousands separators, for example "1,250.00" (F5.R4).
- Two people with the same balance: both are shown, in the order added (F5.R7).

## Acceptance criteria
- **F5.AC1** Given a trip with Sam, Alex and Jo, where Sam paid 90.00 for dinner and Alex paid 30.00 for a taxi, both shared by all three, when the balances are shown, then the rows read "Sam is owed 50.00", "Alex owes 10.00" and "Jo owes 40.00", with two decimal places and thousands separators where needed (product.md › Worked example 1; F5.R1, F5.R4).
- **F5.AC2** Given the trip in F5.AC1, when the balances are shown, then the three amounts add up to exactly zero (F5.R6).
- **F5.AC3** Given an expense of 10.00 paid by Sam and shared by Sam, Alex and Jo, when the balances are shown, then the rows read "Sam is owed 6.66", "Alex owes 3.33" and "Jo owes 3.33", with two decimal places and thousands separators where needed, and the three add up to zero (product.md › Worked example 2; F4.R5; F5.R3, F5.R4, F5.R6).
- **F5.AC4** Given an expense of 30.00 paid by Sam and shared only by Alex and Jo, when the balances are shown, then Sam is owed 30.00, Alex owes 15.00 and Jo owes 15.00 (F4.R4; F5.R1).
- **F5.AC5** Given Sam paid 20.00 shared by Sam and Alex, and Jo is on the trip with no expenses, when the balances are shown, then Sam is owed 10.00, Alex owes 10.00 and Jo is shown as "is settled" (F5.R5, F5.R8).
- **F5.AC6** Given a trip with people and no expenses, when the balances are shown, then every person is shown as "is settled" (F5.R5, F5.R8).
- **F5.AC7** Given a trip with three people added in the order Sam, Alex, Jo, when the balances are shown, then the rows are listed Sam, Alex, Jo (F5.R7).
- **F5.AC8** Given the trip in F5.AC1 and a payment of 40.00 from Jo to Sam passed into the balance calculation, when the balances are calculated, then Jo is shown as "is settled", Sam is owed 10.00 and Alex owes 10.00 (product.md › Worked example 3; F5.R1, F5.R12). The payment is a fake input in a unit test; no payment is stored.
- **F5.AC9** Given the trip in F5.AC1, when Sam's 90.00 expense is deleted and the balances are next requested, then the balances no longer include that expense (F5.R9).
- **F5.AC10** Given a trip with no people, when the Balances section is shown, then it shows no rows and the empty-state copy "Add people to see balances." (States & errors; F5.R7).
- **F5.AC11** Given a request for balances with no logged-in session, or for a trip owned by another user, when the request is handled, then it is refused and no balance data is returned (F5.R11). Unit test: the access check refuses both. Code review: the balance query only reads trips and expenses scoped to the logged-in owner.

## Dependencies
- **Depends on:** F1 (login and the ownership check, F1.R10), F2 (the trip page and the trip, F2.R8), F3 (the people who have balances, F3.R6 order), F4 (the expenses and shares that balances are built from, F4.R5, F4.R8, F4.R14).
- **Needed by:** F6 (settle-up, which reads these balances to suggest payments).
- **Payments:** the calculation takes payments as an input (F5.R12). F5 creates no payments, so F5 is built and tested without F6. F6 supplies the real payments later.
- **Build order:** step 5 (inferred: F4 is step 4).
- **External services:** none.

## Test plan
Unit tests only (project rules). Each test uses the worked examples in product.md where possible.
- Balance calculation for a trip with the worked example 1 data → F5.AC1.
- The sum of all balances is exactly zero for the worked example 1 data → F5.AC2 (F5.R6).
- Worked example 2 (rounding, shares 3.34, 3.33, 3.33) → F5.AC3 (F5.R3).
- Payer not a participant → F5.AC4.
- A person in no expense, and a zero balance shown as "is settled" → F5.AC5, F5.AC6.
- Row order follows the order people were added → F5.AC7.
- Calculation after an expense is removed from the input list → F5.AC9.
- Empty trip (no people) and trip with people but no expenses → F5.AC6, F5.AC10.
- Sign-to-words mapping: positive → "is owed", negative → "owes", zero → "is settled" → F5.R4, F5.R5.
- Amount formatting: two decimal places, with thousands separators (e.g. 1,250.00) → F5.R4.
- Payment input: with no payments, the payments term is zero; with a fake payment of 40.00 from Jo to Sam, the balances in worked example 3 result → F5.R12, F5.AC8.
- Access check on the balances request: refuses a request with no session, and refuses a request for another owner's trip (returns the same response as a missing trip) → F5.AC11, F5.R11.
- Query scoping to the logged-in owner (every balance query reads only that owner's trips and expenses) → F5.AC11, by code review. The check needs the database to prove, so a unit test cannot show it.

## Open questions
None.

## Decisions log
- 2026-11-19: Where do balances appear on the trip page? → A new section below Expenses (F5 User flow).
- 2026-11-19: What does a person with a zero balance show? → "[Name] is settled" (lowercase), with no amount (F5.R5).
- 2026-11-19: What does each balance row show? → Name and balance only; paid and share totals are not shown (F5.R7, Scope).
- 2026-11-19: In what order are the balance rows listed? → Order added to the trip, oldest first, the same as the People list (F5.R7, F3.R6).
- 2026-11-19: Do payments count in balances before F6 exists? → The formula includes payments per product.md R4; the calculation takes payments as an input, and F5 creates none (F5.R1, F5.R12). This follows from product.md and the build order; it was not asked separately.
- 2026-11-19: Are balances stored or calculated? → Calculated from current records each time they are requested (F5.R9). This follows from product.md Goals ("always correct") and was not asked separately.
- 2026-11-19: Thousands separators in balance amounts? → No. Amounts are shown as "1250.00", the same as they are typed (F4.R2) and listed (F4.R8) (F5.R4, Edge cases).
- 2026-11-19: Copy for all messages? → Approved as written in States & errors: heading "Balances"; "Loading balances…"; "Add people to see balances."; "We couldn't load balances. Try again."; rows "[Name] is owed [amount]", "[Name] owes [amount]", "[Name] is settled" (lowercase).
- 2026-11-19: F5.AC8 (payment case) → Not deferred to F6. The calculation takes payments as an input, so AC8 is a unit test now with a fake payment of 40.00 from Jo to Sam (F5.R12, Test plan).
- 2026-11-19: F5.AC11 (ownership) → Matches F2–F4: unit tests for the access check (no session; another owner's trip), and code review for the query scoping (F5.AC11, Test plan).
- 2026-11-19: Approve F5? → Yes. Status set to Approved. Open questions cleared.
- 2026-11-19: Amount format (revised; supersedes the "Thousands separators in balance amounts?" entry above) → Amounts are shown WITH thousands separators everywhere, e.g. "1,250.00", matching `formatCents` in the approved F4 plan (T1). Input stays digits and one decimal point only (F4.R2). Changed: F5.R4, F5.AC1, F5.AC3, Edge cases (large balance). The Test plan line "Amount formatting: two decimal places, no thousands separators (e.g. 1250.00)" was not in the requested changes and still says no separators; it needs the same fix before the plan is rebuilt.
- 2026-11-19: Re-approval after the amount-format change above → Approved by the user. Status stays Approved; the date is 2026-11-19. Docs/plans/F5-balances.md was sent back for the amount format and must be updated to match before build.
- 2026-11-19: Test plan wording aligned with F5.R4 → The Test plan line "Amount formatting: two decimal places, no thousands separators (e.g. 1250.00)" is now "two decimal places, with thousands separators (e.g. 1,250.00)". This is a wording fix only; it changes no requirement or AC, so Status stays Approved. The plan is unaffected, since its amount tests already use the separator form (F5-balances plan T1).
