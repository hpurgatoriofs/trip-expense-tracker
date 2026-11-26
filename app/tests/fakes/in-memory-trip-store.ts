// In-memory fake for the TripStore port (F2). Used by unit tests instead of SQLite.
// `records`, `writeCount`, `listCalls` and `deleteCalls` let a test prove what was
// (or was not) written or queried, for example that a refused request makes no store call.

import type { TripRecord, TripStore } from "../../src/ports/trip-store";

export class InMemoryTripStore implements TripStore {
  /** Keyed by trip id. */
  readonly records = new Map<string, TripRecord>();
  /** Number of writes that changed a record: each create, and each delete that removed a trip. */
  writeCount = 0;
  /** Number of listByOwner calls. */
  listCalls = 0;
  /** Number of deleteForOwner calls, whether or not they matched. */
  deleteCalls = 0;

  async listByOwner(ownerId: string): Promise<TripRecord[]> {
    this.listCalls += 1;
    return [...this.records.values()].filter((r) => r.ownerId === ownerId);
  }

  async create(record: TripRecord): Promise<void> {
    this.records.set(record.id, record);
    this.writeCount += 1;
  }

  async findForOwner(ownerId: string, tripId: string): Promise<TripRecord | null> {
    const record = this.records.get(tripId);
    return record && record.ownerId === ownerId ? record : null;
  }

  async deleteForOwner(ownerId: string, tripId: string): Promise<boolean> {
    this.deleteCalls += 1;
    const record = this.records.get(tripId);
    if (!record || record.ownerId !== ownerId) {
      return false;
    }
    this.records.delete(tripId);
    this.writeCount += 1;
    return true;
  }
}
