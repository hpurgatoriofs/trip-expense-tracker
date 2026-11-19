# F1 — Registration and login

_Status: Approved · Last updated: 2026-11-19 · Source: product.md › MVP scope (F1), Roles, Assumptions, Business rules_

## Summary
A user creates an account with an email and password, then logs in and out. Every trip belongs to one user, so the app must know who is asking before it shows or changes anything. This feature sets up that identity check; the trip features (F2–F6) use it. F1 is first in the build order.

## User stories
- As a new user, I want to register with my email and a password, so that I can keep my own trips.
- As a returning user, I want to log in, so that I can get back to my trips.
- As a user on a shared device, I want to log out, so that nobody else can see my trips.
- As a logged-out visitor, I want to be sent to log in when I open a trip link, so that I can reach the trip after I log in.

## Scope
**In:** Register with email and password; log in; log out; session that ends on logout or browser close; redirect to login for protected pages; login and ownership check on every trip endpoint (the check is built here, and applied to trip endpoints as they are added); a placeholder landing page after login until F2 provides the trips list.
**Out:** Email verification and password reset (product.md › Assumptions). Account lockout after failed logins (decided: out of scope for the MVP). Trips list and trip pages (F2). Sharing trips with other users (product.md › After the core). Login with other providers (product.md › After the core).

## User flow & screens
1. **Register:** the visitor enters email, password and password again, then submits. On success, the account is created and the user is sent to the login page.
2. **Log in:** the user enters email and password and submits. On success, the user goes to the page they asked for before logging in, or to the trips list (F2) if they came straight to login. Until F2 exists, they land on a placeholder page.
3. **Log out:** the user chooses log out. The session ends and the user is sent to the login page.
4. **Protected page while logged out:** the visitor opens a trip URL. They are sent to the login page. After a successful login they return to that URL.

Mock screens: none found in `docs/design`. Screens needed: Register, Log in, placeholder landing page.

## Requirements
- **F1.R1** Registration requires an email, a password, and the password typed again. The two password entries must match. The email must have a basic `name@domain` format.
- **F1.R2** Passwords are 8 to 72 characters. Spaces count as characters, and any characters are allowed. No other password rules apply.
- **F1.R3** Emails are stored in lowercase and are unique, so `A@x.com` and `a@x.com` are the same account. Registering with an email that already has an account is refused, and the user is told the email is already registered. No account is created.
- **F1.R4** Passwords are stored only as hashes. A plain-text password is never stored, logged or returned.
- **F1.R5** Login takes an email and a password. Correct credentials start a session.
- **F1.R6** A failed login (unknown email or wrong password) shows the same message in both cases, and starts no session. The message never says whether the email exists.
- **F1.R7** Logout ends the current session.
- **F1.R8** The session ends when the user logs out or closes the browser. It is not kept after the browser closes. A session also ends 14 days after the user logged in, even if the browser stays open. After that the user must log in again.
- **F1.R9** A logged-out request to a protected page is sent to the login page. After a successful login, the user is sent back to the page they asked for. The return target must be a path inside this app; any other value is ignored.
- **F1.R10** Every trip endpoint requires a logged-in user and checks that the trip belongs to that user. A request that fails either check is refused, and the response reveals nothing about another user's trip.
- **F1.R11** Login is by email and password only. There is no email verification and no password reset (product.md › Assumptions). There is no lockout after failed logins.

## Data & contract
- **User record** (new): `id`, `email` (lowercase, unique), `password_hash`, `created_at` (UTC). Derived from F1.R1, R3, R4 and the ownership rule in product.md › Roles. Times are stored in UTC (project-rules.md).
- **Session:** the storage method is a stack decision, left to the plan. The behavior is fixed by F1.R8: a session cookie with no expiry date, so it ends when the browser closes.
- **Operations needed:** register, log in, log out, and the login-and-ownership check that trip endpoints call. Exact routes, request and response bodies, and error shapes are set in the plan, after the stack is chosen. The error shapes must follow F1.R3 and F1.R6.
- **Browser storage:** none beyond the session.

## States & errors
Copy below was drafted by Claude and approved by the user as written (decided 2026-11-19). Meaning is fixed by the requirements.
- **Register, empty field:** "This field is required."
- **Register, bad email format:** "Enter an email address like name@example.com."
- **Register, passwords do not match:** "The passwords don't match."
- **Register, password too short or too long:** "Password must be 8 to 72 characters."
- **Register, email taken:** "That email is already registered."
- **Log in, failed:** "Email or password is incorrect." (same message for both causes, F1.R6)
- **Logged out:** "You are logged out." then the login page
- **Protected page, logged out:** redirect to login, no error (F1.R9).
- **Session ended by the browser:** the next protected request redirects to login (F1.R9).
- **Loading:** the submit button is disabled while a request is in flight, so a double submit cannot create two sessions. Copy: none.

## Accessibility
- Every field has a visible label, and errors are linked to their field and announced to screen readers.
- The whole flow works with the keyboard only; focus goes to the first field with an error after a failed submit.
- No show/hide password control (decided). The password field is a plain masked input.
- Contrast and focus styles follow the app's theme once the stack is chosen.
- No motion is used in this feature, so reduced-motion rules do not apply.

## Edge cases
- Email typed with capital letters: stored and compared in lowercase (F1.R3), so it matches the existing account.
- Email without an `@` or a domain: rejected by the format check (F1.R1).
- Password of exactly 8 characters: accepted. Password of 7 characters: rejected.
- Password of exactly 72 characters: accepted. Password of 73 characters: rejected. The limit counts characters (decided).
- Password of 8 spaces: accepted, since spaces count as characters (F1.R2).
- Password and confirmation differ only by trailing spaces: treated as different (no trimming of passwords).
- Two submits at once from the register form: at most one account is created for that email (F1.R3 uniqueness is enforced by the database, see code review).
- Logout when the session has already ended: no error, the user lands on login.
- Protected page reached with a return target that is an outside address: the target is dropped; the user lands on the default page (F1.R9).
- Login while already logged in: the new session replaces the old one.
- Many failed logins in a row: no lockout, by decision (F1.R11).

## Acceptance criteria
- **F1.AC1** Given no account exists for an email, when a user registers with that email, a valid password of 8 to 72 characters, and a matching confirmation, then an account is created with the email stored in lowercase and the password stored only as a hash.
- **F1.AC2** Given a password of fewer than 8 or more than 72 characters, when a user registers, then registration is refused and no account is created.
- **F1.AC3** Given the two password entries differ, when a user registers, then registration is refused and no account is created.
- **F1.AC4** Given an account already exists for an email (compared in lowercase), when a user registers with that email, then registration is refused with a message that the email is already registered, and no second account is created.
- **F1.AC5** Given a registered user, when they log in with the correct email and password, then a session starts and they can reach protected pages.
- **F1.AC6** Given an unknown email, or a wrong password, when a user logs in, then both cases show the same message, and no session starts.
- **F1.AC7** Given a logged-in user, when they log out, then the session ends and their next request to a protected page is redirected to login.
- **F1.AC8** Given a successful login, when the session cookie is set, then the cookie has no expiry date or max-age, so the browser drops it when closed.
- **F1.AC9** Given a logged-out visitor, when they open a trip URL and then log in, then they are sent back to that URL.
- **F1.AC10** Given a return target that points outside the app, when a logged-out visitor logs in, then they are not sent to that address.
- **F1.AC11** Given a logged-in user, when they call any trip endpoint for a trip they do not own, or with no session, then the request is refused and no trip data is returned.
- **F1.AC12** Given any registration or login, when the request is processed, then the password is not written to logs or responses.
- **F1.AC13** Given an email with bad format, or with capital letters, when a user registers, then a bad format is refused, and capitals are stored in lowercase.
- **F1.AC14** Given a successful login, when 14 days have passed since that login with the browser still open, then the session is refused and the user's next request to a protected page is redirected to login. The cookie itself still has no expiry date (F1.AC8).

## Dependencies
- **Build order:** step 1. F2–F6 depend on this feature's login and ownership check (F1.R10). The landing page after login becomes the trips list in F2.
- **External services:** none in product scope. Technical choices (stack, hashing, session storage) are made in the plan, once the stack is set in `CLAUDE.md`.

## Test plan
Unit tests only, per project-rules.md. Logic is kept where it can be tested with fakes (no database, network or running app).
- **F1.AC1** — unit test: the registration service with a fake user store creates the record with a lowercase email and stores a hash, not the password.
- **F1.AC2, F1.AC3** — unit test: validation rejects a password under 8 or over 72 characters, and a mismatched confirmation; the fake store is never written.
- **F1.AC4** — unit test: the registration service with a fake store that already has the email (in lowercase) refuses it and writes nothing.
- **F1.AC5, F1.AC6** — unit test: login service with a fake store returns a session for correct credentials, and the same failure result for unknown email and wrong password.
- **F1.AC7** — unit test: the session logout clears the session, and the access check then refuses.
- **F1.AC8** — unit test: the session cookie options contain no expiry or max-age.
- **F1.AC9, F1.AC10** — unit test: the return-target function keeps in-app paths and drops outside addresses.
- **F1.AC11** — code review: ownership is checked in each trip query (the database query itself cannot be proven by a unit test).
- **F1.AC12** — unit test: the hashing and the logging wrapper never receive the plain password in the record they write; plus code review of log calls.
- **F1.AC13** — unit test: the email validator rejects a malformed address, and the normaliser lowercases a mixed-case one.
- **F1.AC14** — unit test: the access check, given a session whose login time is more than 14 days before a passed-in current time, refuses it; a session 13 days old is accepted.

## Open questions
None. OQ5 (copy) and OQ8 (limit counting) are resolved; see the Decisions log.

## Decisions log
- 2026-11-18: Minimum password length? → 8 characters (Recommended), with no other complexity rules (the option shown read "No other complexity rules"). Recorded in F1.R2.
- 2026-11-18: How long should a user stay logged in? → Until logout or browser close (session cookie). Implemented as F1.R8 and F1.AC8.
- 2026-11-18: Failed login message? → Same message for an unknown email and a wrong password (F1.R6). Registration of an existing email is a separate question below.
- 2026-11-18: After a logged-out visitor opens a trip page URL, or after login/registration, where should they go? → Login page, then back to the page they asked for (F1.R9).
- 2026-11-18: Registration with an email that already has an account? → Say the email is already registered (F1.R3). This means registration reveals whether an email has an account, while login does not.
- 2026-11-18: Register form asks for the password twice? → Yes, with a match check (F1.R1).
- 2026-11-19: OQ1 (email) → Case-insensitive, stored lowercase, basic name@domain format check (F1.R1, R3, AC13).
- 2026-11-19: OQ2 (after registering) → Go to the login page (F1 flow step 1, F1.R9 covers the return path).
- 2026-11-19: OQ3 (landing after login) → Trips list, built in F2; placeholder page until then (flow step 2, Scope).
- 2026-11-19: OQ4 (password characters) → Spaces count; 8 to 72 characters; any characters allowed (F1.R2, AC2).
- 2026-11-19: OQ5 (message copy) → Keep messages short and generic; Claude drafts them for the user to review. The login failure message does not reveal whether an email exists (F1.R6). Drafts are in States & errors; approved as written on the same day (see below).
- 2026-11-19: OQ6 (show/hide password) → No toggle (Accessibility).
- 2026-11-19: OQ7 (failed-login limit) → No lockout for the MVP, out of scope (Scope, F1.R11).
- 2026-11-19: Approval → User approved F1 (status set to Approved).
- 2026-11-19: OQ5 (copy) → User approved the drafted messages in States & errors as written. Claude reviewed them and kept them unchanged.
- 2026-11-19: OQ8 (72 limit) → 72 characters, counted as characters (F1.R2, Edge cases). How passwords are hashed is a plan decision, not part of this spec.
- 2026-11-19: Session length while the browser stays open? (raised by the plan) → A session also ends 14 days after login, even if the browser stays open. The user must log in again after that. Added to F1.R8 and F1.AC14; test plan line added. Other sections unchanged.
- 2026-11-19: Status reset to Draft because the substance of an Approved spec changed (F1.R8, F1.AC14). The plan in `docs/plans/F1-registration-and-login.md` may be out of date and needs a check before build. Re-approval is pending.
- 2026-11-19: Approval → User re-approved F1 with the 14-day session limit (F1.R8, F1.AC14). Status set to Approved.
