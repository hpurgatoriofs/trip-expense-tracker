// Registration use case (F1.AC1 to F1.AC4, F1.AC12). Pure orchestration: stores, hasher, logger,
// clock and id generator arrive as arguments. No imports from db/, next/, iron-session or @node-rs/argon2.

import { validateRegistration, type RegistrationInput, type ValidationError } from "../domain/validation";
import type { Logger } from "../ports/logger";
import type { PasswordHasher } from "../ports/password-hasher";
import type { UserStore } from "../ports/user-store";

export type RegisterDeps = {
  users: UserStore;
  hasher: PasswordHasher;
  logger: Logger;
  /** Returns the current time. Passed in so tests do not depend on the clock. */
  now: () => Date;
  /** Returns a new unique user id. */
  newId: () => string;
};

export type RegisterResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] }
  | { ok: false; reason: "email_taken" };

/**
 * Registers a new account. Validation runs first. A duplicate email (compared in lowercase)
 * is refused before any hash is made or any record is written. The password is never logged.
 */
export async function register(deps: RegisterDeps, input: RegistrationInput): Promise<RegisterResult> {
  const validated = validateRegistration(input);
  if (!validated.ok) {
    return { ok: false, errors: validated.errors };
  }

  const { email, password } = validated;

  const existing = await deps.users.findByEmail(email);
  if (existing !== null) {
    return { ok: false, reason: "email_taken" };
  }

  const passwordHash = await deps.hasher.hash(password);
  const userId = deps.newId();

  const created = await deps.users.create({
    id: userId,
    email,
    passwordHash,
    createdAt: deps.now(),
  });
  if (!created.ok) {
    return { ok: false, reason: created.reason };
  }

  // Logs the id only: never the email or the password (F1.AC12).
  deps.logger.info({ userId }, "account created");
  return { ok: true };
}
