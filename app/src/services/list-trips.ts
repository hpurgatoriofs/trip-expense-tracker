// List-trips use case (F2.AC6, F2.AC7, F2.AC12). Pure orchestration: session, store and clock
// arrive as arguments. No imports from db/, next/, iron-session or @node-rs/argon2.

import { sortNewestFirst, type TripSummary } from "../domain/trip-view";
import type { SessionStore } from "../ports/session-store";
import type { TripStore } from "../ports/trip-store";
import { requireUser } from "./require-user";

export type ListTripsDeps = {
  session: SessionStore;
  trips: TripStore;
  /** Returns the current time. Passed in so tests do not depend on the clock. */
  now: () => Date;
};

export type ListTripsResult =
  | { ok: true; trips: TripSummary[] }
  | { ok: false; error: "not_logged_in" };

/**
 * Returns the logged-in user's trips as { id, name, createdAt } with createdAt as a UTC ISO
 * instant, newest first (F2 API shape). The owner comes from the session only.
 * A refused session returns not_logged_in and makes no store call.
 */
export async function listTrips(deps: ListTripsDeps): Promise<ListTripsResult> {
  const auth = await requireUser({ session: deps.session, now: deps.now });
  if (!auth.ok) {
    return { ok: false, error: "not_logged_in" };
  }

  const owned = await deps.trips.listByOwner(auth.userId);
  const summaries: TripSummary[] = owned.map((trip) => ({
    id: trip.id,
    name: trip.name,
    createdAt: trip.createdAt.toISOString(),
  }));
  return { ok: true, trips: sortNewestFirst(summaries) };
}
