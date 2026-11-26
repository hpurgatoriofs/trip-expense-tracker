import { eq } from "drizzle-orm";
import type { CreateUserResult, UserRecord, UserStore } from "../ports/user-store";
import type { Db } from "./client";
import { users } from "./schema";

// SQLite reports a unique-constraint violation with this error code.
const UNIQUE_VIOLATION = "SQLITE_CONSTRAINT_UNIQUE";
const EMAIL_COLUMN_MESSAGE = "users.email";

// Drizzle wraps driver errors in DrizzleQueryError, with the driver error in `cause`.
// Returns true only when the error is a unique violation on users.email.
function isEmailUniqueViolation(error: unknown): boolean {
  const candidates: unknown[] = [error];
  if (error instanceof Error && error.cause !== undefined) {
    candidates.push(error.cause);
  }
  return candidates.some((candidate) => {
    if (!(candidate instanceof Error)) return false;
    const code = (candidate as Error & { code?: unknown }).code;
    return code === UNIQUE_VIOLATION && candidate.message.includes(EMAIL_COLUMN_MESSAGE);
  });
}

// Drizzle store for the users table. Every query uses Drizzle's parameterised
// builders; no SQL is built from strings. Only the email unique violation is
// mapped to a result; every other error is rethrown.
export function createUserStore(db: Db): UserStore {
  return {
    async findByEmail(email: string): Promise<UserRecord | null> {
      const rows = db.select().from(users).where(eq(users.email, email)).limit(1).all();
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.passwordHash,
        createdAt: new Date(row.createdAt),
      };
    },

    async create(record: UserRecord): Promise<CreateUserResult> {
      try {
        db.insert(users)
          .values({
            id: record.id,
            email: record.email,
            passwordHash: record.passwordHash,
            createdAt: record.createdAt.toISOString(),
          })
          .run();
        return { ok: true };
      } catch (error) {
        if (isEmailUniqueViolation(error)) {
          return { ok: false, reason: "email_taken" };
        }
        throw error;
      }
    },
  };
}
