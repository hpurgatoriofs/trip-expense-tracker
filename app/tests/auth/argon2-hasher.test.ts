import { describe, expect, it } from "vitest";
import { createArgon2Hasher } from "../../src/auth/argon2-hasher";

describe("createArgon2Hasher", () => {
  it("F1.AC1 hashes with argon2id and verifies only the right password", async () => {
    const hasher = await createArgon2Hasher();
    const stored = await hasher.hash("correct horse battery");

    expect(stored.startsWith("$argon2id$")).toBe(true);
    expect(await hasher.verify(stored, "correct horse battery")).toBe(true);
    expect(await hasher.verify(stored, "correct horse battery!")).toBe(false);
    expect(await hasher.verify(stored, "Correct horse battery")).toBe(false);
  });

  it("F1.AC12 the stored hash string does not contain the plain password", async () => {
    const hasher = await createArgon2Hasher();
    const password = "plain-secret-Pass-9876";
    const stored = await hasher.hash(password);

    expect(stored).not.toContain(password);
  });

  it("F1.AC1 returns false instead of throwing for a malformed stored hash", async () => {
    const hasher = await createArgon2Hasher();

    expect(await hasher.verify("not-a-valid-hash", "anything")).toBe(false);
  });

  it("F1.AC1 the dummy hash is a real argon2id hash that verifies no known password", async () => {
    const hasher = await createArgon2Hasher();

    expect(hasher.dummyHash.startsWith("$argon2id$")).toBe(true);
    expect(await hasher.verify(hasher.dummyHash, "anything-at-all")).toBe(false);
  });
});
