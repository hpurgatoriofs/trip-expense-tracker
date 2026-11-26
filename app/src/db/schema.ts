import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

// A trip belongs to one user. The owner reference has no cascade: users are not
// deleted in the MVP. Trip names are stored trimmed; the CHECK enforces 1 to 100 characters.
export const trips = sqliteTable(
  "trips",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    check("trips_name_length", sql`length(${table.name}) BETWEEN 1 AND 100`),
    index("trips_owner_created").on(table.ownerId, table.createdAt),
  ],
);
