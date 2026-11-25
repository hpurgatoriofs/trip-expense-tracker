// Access check for every trip endpoint (F1.AC11, F1.AC14). Trip endpoints call this first and
// pass the returned userId into every trip query, which must filter by it (code review).
// Pure orchestration: the session and clock arrive as arguments.

import { isSessionExpired } from "../domain/session-age";
import type { SessionStore } from "../ports/session-store";

export type RequireUserDeps = {
  session: SessionStore;
  /** Returns the current time. Passed in so tests do not depend on the clock. */
  now: () => Date;
};

export type RequireUserResult =
  | { ok: true; userId: string }
  | { ok: false; error: "not_logged_in" };

/**
 * Returns the logged-in user's id, or refuses when there is no session or the session
 * is 14 days old or more.
 */
export async function requireUser(deps: RequireUserDeps): Promise<RequireUserResult> {
  const current = await deps.session.current();
  if (current === null) {
    return { ok: false, error: "not_logged_in" };
  }
  if (isSessionExpired(current.loggedInAt, deps.now())) {
    return { ok: false, error: "not_logged_in" };
  }
  return { ok: true, userId: current.userId };
}
