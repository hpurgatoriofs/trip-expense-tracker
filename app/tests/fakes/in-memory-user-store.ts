// In-memory fake for the UserStore port (F1). Used by unit tests instead of SQLite.
// `records` and `writeCount` let a test prove what was (or was not) written.

import type {
  CreateUserResult,
  UserRecord,
  UserStore,
} from "../../src/ports/user-store";

export class InMemoryUserStore implements UserStore {
  /** Keyed by email, exactly as passed in. */
  readonly records = new Map<string, UserRecord>();
  /** Number of successful writes (creates that stored a record). Rejected creates do not count. */
  writeCount = 0;

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.records.get(email) ?? null;
  }

  async create(record: UserRecord): Promise<CreateUserResult> {
    if (this.records.has(record.email)) {
      return { ok: false, reason: "email_taken" };
    }
    this.records.set(record.email, record);
    this.writeCount += 1;
    return { ok: true };
  }
}
