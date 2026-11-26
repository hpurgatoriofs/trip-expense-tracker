// Create-trip use case (F2.AC1 to F2.AC5, F2.AC12). Pure orchestration: session, store, clock,
// id generator and logger arrive as arguments. No imports from db/, next/, iron-session or @node-rs/argon2.

import { validateTripName, type TripNameErrorCode } from "../domain/trip-name";
import type { Logger } from "../ports/logger";
import type { SessionStore } from "../ports/session-store";
import type { TripRecord, TripStore } from "../ports/trip-store";
import { requireUser } from "./require-user";

export type CreateTripDeps = {
  session: SessionStore;
  trips: TripStore;
  /** Returns the current time. Passed in so tests do not depend on the clock. */
  now: () => Date;
  /** Returns a new unique trip id. */
  newId: () => string;
  logger: Logger;
};

/** Only the name is read. Any other field in the request, such as an owner id, is ignored (F2.AC1). */
export type CreateTripInput = { name: unknown };

export type CreateTripResult =
  | { ok: true; trip: TripRecord }
  | { ok: false; error: "not_logged_in" }
  | { ok: false; error: TripNameErrorCode };

/**
 * Creates a trip owned by the logged-in user. The owner comes from the session only.
 * A refused session or an invalid name writes nothing. The name is never logged.
 */
export async function createTrip(deps: CreateTripDeps, input: CreateTripInput): Promise<CreateTripResult> {
  const auth = await requireUser({ session: deps.session, now: deps.now });
  if (!auth.ok) {
    return { ok: false, error: "not_logged_in" };
  }

  const validated = validateTripName(input.name);
  if (!validated.ok) {
    return { ok: false, error: validated.code };
  }

  const trip: TripRecord = {
    id: deps.newId(),
    ownerId: auth.userId,
    name: validated.name,
    createdAt: deps.now(),
  };

  await deps.trips.create(trip);

  // Logs the ids only: never the trip name.
  deps.logger.info({ tripId: trip.id, ownerId: trip.ownerId }, "trip created");
  return { ok: true, trip };
}
