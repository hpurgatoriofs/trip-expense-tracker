// Login use case (F1.AC5, F1.AC6, F1.AC12, F1.AC14). Pure orchestration: stores, hasher, session,
// logger and clock arrive as arguments. No imports from db/, next/, iron-session or @node-rs/argon2.

import { normalizeEmail } from "../domain/validation";
import type { Logger } from "../ports/logger";
import type { PasswordHasher } from "../ports/password-hasher";
import type { SessionStore } from "../ports/session-store";
import type { UserStore } from "../ports/user-store";

export type LoginDeps = {
  users: UserStore;
  hasher: PasswordHasher;
  session: SessionStore;
  logger: Logger;
  /** Returns the current time. Passed in so tests do not depend on the clock. */
  now: () => Date;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResult =
  | { ok: true; userId: string }
  | { ok: false; error: "invalid_credentials" };

/**
 * Logs a user in. An unknown email and a wrong password give the same result, and neither
 * starts a session. When no user matches, the password is still verified against a dummy
 * hash so that response time does not reveal which emails exist. Starting a session
 * overwrites any existing one. The password and the email are never logged.
 */
export async function login(deps: LoginDeps, input: LoginInput): Promise<LoginResult> {
  const email = normalizeEmail(input.email);
  const user = await deps.users.findByEmail(email);

  const hashToCheck = user !== null ? user.passwordHash : deps.hasher.dummyHash;
  const passwordOk = await deps.hasher.verify(hashToCheck, input.password);

  if (user === null || !passwordOk) {
    // No email in the log line (F1.AC12).
    deps.logger.warn({ reason: "invalid_credentials" }, "login failed");
    return { ok: false, error: "invalid_credentials" };
  }

  await deps.session.start(user.id, deps.now().toISOString());
  return { ok: true, userId: user.id };
}
