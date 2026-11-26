// Real dependencies for the trip routes (F2.R5, F2.R11). Built once, on first use, so that importing
// this module does not open the database or read the environment. Only the route handlers import it.

import { createIronSessionStore } from "@/auth/iron-session-store";
import { getDb } from "@/db/client";
import { createTripStore } from "@/db/trip-store";
import { loadConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import type { Logger } from "@/ports/logger";
import type { SessionStore } from "@/ports/session-store";
import type { TripStore } from "@/ports/trip-store";

export type TripDeps = {
  session: SessionStore;
  trips: TripStore;
  /** Returns the current time. */
  now: () => Date;
  /** Returns a new unique trip id. */
  newId: () => string;
  logger: Logger;
};

let tripDeps: TripDeps | undefined;

export function getTripDeps(): TripDeps {
  if (!tripDeps) {
    tripDeps = {
      session: createIronSessionStore(loadConfig()),
      trips: createTripStore(getDb()),
      now: () => new Date(),
      newId: () => crypto.randomUUID(),
      logger,
    };
  }
  return tripDeps;
}
