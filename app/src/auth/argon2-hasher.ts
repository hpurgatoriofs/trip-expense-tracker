// Argon2id password hasher (F1). Implements the PasswordHasher port with @node-rs/argon2,
// using the library's default argon2id parameters.

import { hash, verify } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import type { PasswordHasher } from "../ports/password-hasher";

/**
 * Creates the hasher. The dummy hash is computed once here, from a random value,
 * so a login for an unknown email runs the same verify work as a known one (F1.R6).
 */
export async function createArgon2Hasher(): Promise<PasswordHasher> {
  const dummyHash = await hash(randomBytes(32).toString("hex"));

  return {
    dummyHash,

    hash(password: string): Promise<string> {
      return hash(password);
    },

    async verify(storedHash: string, password: string): Promise<boolean> {
      try {
        return await verify(storedHash, password);
      } catch {
        // A malformed stored hash is treated as a mismatch, not as a crash.
        return false;
      }
    },
  };
}
