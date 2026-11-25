// Logout use case (F1.AC7). Pure orchestration: the session and logger arrive as arguments.

import type { Logger } from "../ports/logger";
import type { SessionStore } from "../ports/session-store";

export type LogoutDeps = {
  session: SessionStore;
  logger: Logger;
};

export type LogoutResult = { ok: true };

/**
 * Ends the current session. Succeeds even when no session exists, so a repeated logout
 * or a logout with an expired cookie is not an error.
 */
export async function logout(deps: LogoutDeps): Promise<LogoutResult> {
  await deps.session.end();
  deps.logger.info({}, "logged out");
  return { ok: true };
}
