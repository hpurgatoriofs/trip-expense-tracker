// Port for trip persistence (F2). Interface only. Implemented on Drizzle in src/db/trip-store.ts.
//
// Contract: every method takes the owner id. A store must never return or change a trip
// that belongs to another owner. deleteForOwner removes the trip and its child rows
// (people, expenses, payments from F3 to F6) together, and returns false when nothing matched.

export type TripRecord = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: Date;
};

export interface TripStore {
  /** The owner's trips, in any order. The caller sorts them. */
  listByOwner(ownerId: string): Promise<TripRecord[]>;
  create(record: TripRecord): Promise<void>;
  /** The trip with this id if the owner has it, otherwise null. */
  findForOwner(ownerId: string, tripId: string): Promise<TripRecord | null>;
  /** Removes the trip and its children. Returns false when no trip matched this owner and id. */
  deleteForOwner(ownerId: string, tripId: string): Promise<boolean>;
}
