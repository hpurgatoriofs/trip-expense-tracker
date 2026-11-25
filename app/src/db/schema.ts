import { sql } from "drizzle-orm";
import { check, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Times are stored as ISO 8601 UTC text, for example 2026-11-19T10:00:00.000Z.
// The email is stored lower-cased; the CHECK enforces it at the database level.
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [check("users_email_lowercase", sql`${table.email} = lower(${table.email})`)],
);
