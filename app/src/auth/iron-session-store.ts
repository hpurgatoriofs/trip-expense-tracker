// iron-session adapter for the SessionStore port (F1). Thin: it only calls the session library
// with the options from session-options.ts. Route handlers pass it to the login and logout services.

import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import type { SessionStore } from "../ports/session-store";
import { sessionOptions, type SessionData } from "./session-options";
import { loadConfig, type AppConfig } from "../lib/config";

/**
 * Creates the store. Reads the cookie jar for the current request on each call.
 * The config defaults to the environment loader so route handlers can call it with no arguments.
 */
export function createIronSessionStore(config: AppConfig = loadConfig()): SessionStore {
  const options = sessionOptions(config);

  async function session() {
    return getIronSession<SessionData>(await cookies(), options);
  }

  return {
    async start(userId: string, loggedInAt: string): Promise<void> {
      const s = await session();
      s.userId = userId;
      s.loggedInAt = loggedInAt;
      await s.save();
    },

    async end(): Promise<void> {
      const s = await session();
      s.destroy();
    },

    async current() {
      const s = await session();
      if (!s.userId || !s.loggedInAt) {
        return null;
      }
      return { userId: s.userId, loggedInAt: s.loggedInAt };
    },
  };
}
