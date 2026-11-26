// Session age rule (F1.R8, F1.AC14). Pure function: both times are passed in, nothing reads the clock.

/** Session lifetime after login: 14 days, in seconds. Used by the iron-session ttl (F1.T11). */
export const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

/**
 * True when the session was started 14 days or more before `now`.
 * `loggedInAt` is an ISO 8601 UTC timestamp. An unreadable timestamp counts as expired,
 * so a bad value fails closed.
 */
export function isSessionExpired(loggedInAt: string, now: Date): boolean {
  const loggedInMs = Date.parse(loggedInAt);
  if (Number.isNaN(loggedInMs)) {
    return true;
  }
  return now.getTime() - loggedInMs >= SESSION_MAX_AGE_MS;
}
