import { and, desc, eq } from "drizzle-orm";
import type { TripRecord, TripStore } from "../ports/trip-store";
import type { Db } from "./client";
import { trips } from "./schema";

// Drizzle store for the trips table. Every query uses Drizzle's parameterised
// builders; no SQL is built from strings. Every query filters on owner_id, so a
// store never returns or changes another owner's trip. Child rows are removed by
// the cascading foreign keys in the schema. Errors are rethrown, not swallowed.
export function createTripStore(db: Db): TripStore {
  return {
    async listByOwner(ownerId: string): Promise<TripRecord[]> {
      const rows = db
        .select()
        .from(trips)
        .where(eq(trips.ownerId, ownerId))
        .orderBy(desc(trips.createdAt))
        .all();
      return rows.map((row) => ({
        id: row.id,
        ownerId: row.ownerId,
        name: row.name,
        createdAt: new Date(row.createdAt),
      }));
    },

    async create(record: TripRecord): Promise<void> {
      db.insert(trips)
        .values({
          id: record.id,
          ownerId: record.ownerId,
          name: record.name,
          createdAt: record.createdAt.toISOString(),
        })
        .run();
    },

    async findForOwner(ownerId: string, tripId: string): Promise<TripRecord | null> {
      const row = db
        .select()
        .from(trips)
        .where(and(eq(trips.id, tripId), eq(trips.ownerId, ownerId)))
        .limit(1)
        .all()[0];
      if (!row) return null;
      return {
        id: row.id,
        ownerId: row.ownerId,
        name: row.name,
        createdAt: new Date(row.createdAt),
      };
    },

    async deleteForOwner(ownerId: string, tripId: string): Promise<boolean> {
      return db.transaction((tx) => {
        const result = tx
          .delete(trips)
          .where(and(eq(trips.id, tripId), eq(trips.ownerId, ownerId)))
          .run();
        return result.changes > 0;
      });
    },
  };
}
