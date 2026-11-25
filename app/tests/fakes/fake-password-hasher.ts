// Fake for the PasswordHasher port (F1). Not secure: it only lets tests run without argon2.
// Hash format: `sha256:<hex digest of the password>`.

import { createHash } from "node:crypto";
import type { PasswordHasher } from "../../src/ports/password-hasher";

const PREFIX = "sha256:";

function digest(password: string): string {
  return PREFIX + createHash("sha256").update(password, "utf8").digest("hex");
}

export class FakeHasher implements PasswordHasher {
  /** A fixed, valid-format hash used when no user matches a login attempt. */
  readonly dummyHash = PREFIX + "0".repeat(64);

  async hash(password: string): Promise<string> {
    return digest(password);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    return hash === digest(password);
  }
}
