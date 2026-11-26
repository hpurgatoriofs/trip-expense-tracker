// Get-one-trip use case (F2.AC8, F2.AC11, F2.AC12, F2.AC13). Pure orchestration: session, store
// and clock arrive as arguments. No imports from db/, next/, iron-session or @node-rs/argon2.

import type { TripSummary } from "../domain/trip-view";
import type { SessionStore } from "../ports/session-store";
import type { TripStore } from "../ports/trip-store";
import { requireUser } from "./require-user";

export type GetTripDeps = {
  session: SessionStore;
  trips: TripStore;
  /** Returns the current time. Passed in so tests do not depend on the clock. */
  now: () => Date;
};

export type GetTripInput = { tripId: string };

export type GetTripResult =
  | { ok: true; trip: TripSummary }
  | { ok: false; error: "not_logged_in" }
  | { ok: false; error: "not_found" };

/**
 * Returns one trip the logged-in user owns as { id, name, createdAt } with createdAt as a UTC ISO
 * instant. A trip owned by someone else, a missing trip and a deleted trip all return the same
 * not_found result, with no trip data in it (F2.AC8, F2.AC11, F2.AC13).
 * A refused session returns not_logged_in and makes no store call.
 */
export async function getTrip(deps: GetTripDeps, input: GetTripInput): Promise<GetTripResult> {
  const auth = await requireUser({ session: deps.session, now: deps.now });
  if (!auth.ok) {
    return { ok: false, error: "not_logged_in" };
  }

  const record = await deps.trips.findForOwner(auth.userId, input.tripId);
  if (record === null) {
    return { ok: false, error: "not_found" };
  }

  return {
    ok: true,
    trip: {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt.toISOString(),
    },
  };
}
