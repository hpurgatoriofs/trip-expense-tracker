import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { loadConfig } from "../lib/config";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

// Opens the SQLite file at the given path. Migrations are not run here;
// apply them by hand with `npm run db:migrate`.
export function createDb(databaseUrl: string): Db {
  const sqlite = new Database(databaseUrl);
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

let client: Db | undefined;

// Lazily opens the database at config.databaseUrl on first use, so importing
// this module does not touch the file system.
export function getDb(): Db {
  if (!client) {
    client = createDb(loadConfig().databaseUrl);
  }
  return client;
}
