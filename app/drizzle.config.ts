import { defineConfig } from "drizzle-kit";

// DATABASE_URL is the path to the SQLite file, set in the environment (see .env.example).
// It is read here, never hard-coded.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
