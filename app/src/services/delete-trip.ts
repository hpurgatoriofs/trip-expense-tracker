// Delete-trip use case (F2.AC10, F2.AC11, F2.AC12, F2.AC13). Pure orchestration: session, store,
// clock and logger arrive as arguments. No imports from db/, next/, iron-session or @node-rs/argon2.

import type { Logger } from "../ports/logger";
import type { SessionStore } from "../ports/session-store";
import type { TripStore } from "../ports/trip-store";
import { requireUser } from "./require-user";

export type DeleteTripDeps = {
  session: SessionStore;
  trips: TripStore;
  /** Returns the current time. Passed in so tests do not depend on the clock. */
  now: () => Date;
  logger: Logger;
};

export type DeleteTripInput = { tripId: string };

export type DeleteTripResult =
  | { ok: true }
  | { ok: false; error: "not_logged_in" }
  | { ok: false; error: "not_found" };

/**
 * Deletes one trip the logged-in user owns, with its child rows (the store does the cascade).
 * A trip owned by someone else, a missing trip and an already-deleted trip all return not_found
 * (F2.AC10, F2.AC11, F2.AC13). A refused session returns not_logged_in and makes no store call.
 */
export async function deleteTrip(deps: DeleteTripDeps, input: DeleteTripInput): Promise<DeleteTripResult> {
  const auth = await requireUser({ session: deps.session, now: deps.now });
  if (!auth.ok) {
    return { ok: false, error: "not_logged_in" };
  }

  const deleted = await deps.trips.deleteForOwner(auth.userId, input.tripId);
  if (!deleted) {
    return { ok: false, error: "not_found" };
  }

  // Logs the ids only.
  deps.logger.info({ tripId: input.tripId, ownerId: auth.userId }, "trip deleted");
  return { ok: true };
}
