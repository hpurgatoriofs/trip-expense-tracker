import { describe, expect, it } from "vitest";
import { register, type RegisterDeps } from "../../src/services/register";
import { FakeHasher } from "../fakes/fake-password-hasher";
import { FakeLogger } from "../fakes/fake-logger";
import { InMemoryUserStore } from "../fakes/in-memory-user-store";

const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z");

function makeDeps(overrides: Partial<RegisterDeps> = {}) {
  const users = new InMemoryUserStore();
  const hasher = new FakeHasher();
  const logger = new FakeLogger();
  let counter = 0;
  const deps: RegisterDeps = {
    users,
    hasher,
    logger,
    now: () => FIXED_NOW,
    newId: () => `user-${++counter}`,
    ...overrides,
  };
  return { deps, users, hasher, logger };
}

const VALID = {
  email: "Alice@Example.com",
  password: "correct horse battery",
  confirm: "correct horse battery",
};

describe("register", () => {
  it("F1.AC1 creates the account with a lowercase email and a hash, not the password", async () => {
    const { deps, users, hasher } = makeDeps();

    const result = await register(deps, VALID);

    expect(result).toEqual({ ok: true });
    expect(users.writeCount).toBe(1);
    const stored = users.records.get("alice@example.com");
    expect(stored).toBeDefined();
    expect(stored!.email).toBe("alice@example.com");
    expect(stored!.passwordHash).toBe(await hasher.hash(VALID.password));
    expect(stored!.passwordHash).not.toBe(VALID.password);
    expect(stored!.id).toBe("user-1");
    expect(stored!.createdAt).toEqual(FIXED_NOW);
  });

  it("F1.AC2 writes nothing when the password is too short", async () => {
    const { deps, users } = makeDeps();

    const result = await register(deps, {
      email: "bob@example.com",
      password: "short7!",
      confirm: "short7!",
    });

    expect(result.ok).toBe(false);
    expect(result).toEqual({
      ok: false,
      errors: [{ field: "password", code: "password_length" }],
    });
    expect(users.writeCount).toBe(0);
    expect(users.records.size).toBe(0);
  });

  it("F1.AC2 writes nothing when the password is too long", async () => {
    const { deps, users } = makeDeps();
    const long = "a".repeat(73);

    const result = await register(deps, { email: "bob@example.com", password: long, confirm: long });

    expect(result).toEqual({
      ok: false,
      errors: [{ field: "password", code: "password_length" }],
    });
    expect(users.writeCount).toBe(0);
  });

  it("F1.AC3 writes nothing when the passwords differ", async () => {
    const { deps, users } = makeDeps();

    const result = await register(deps, {
      email: "carol@example.com",
      password: "correct horse battery",
      confirm: "correct horse batterY",
    });

    expect(result).toEqual({
      ok: false,
      errors: [{ field: "confirm", code: "password_mismatch" }],
    });
    expect(users.writeCount).toBe(0);
    expect(users.records.size).toBe(0);
  });

  it("F1.AC4 refuses an email already registered in lowercase and writes nothing", async () => {
    const { deps, users } = makeDeps();
    await register(deps, VALID);
    expect(users.writeCount).toBe(1);

    const result = await register(deps, {
      email: "  ALICE@example.com ",
      password: "another password",
      confirm: "another password",
    });

    expect(result).toEqual({ ok: false, reason: "email_taken" });
    expect(users.writeCount).toBe(1);
    expect(users.records.size).toBe(1);
  });

  it("F1.AC4 maps an email_taken reported by the store", async () => {
    const { deps, users } = makeDeps();
    // Simulate a race: the pre-check finds nothing, but the store rejects the insert.
    users.findByEmail = async () => null;
    await users.create({
      id: "existing",
      email: "alice@example.com",
      passwordHash: "x",
      createdAt: FIXED_NOW,
    });

    const result = await register(deps, VALID);

    expect(result).toEqual({ ok: false, reason: "email_taken" });
    expect(users.writeCount).toBe(1);
  });

  it("F1.AC12 never passes the password to the logger", async () => {
    const { deps, logger } = makeDeps();
    const password = "plain-secret-Pass-9876";

    const result = await register(deps, { email: "dan@example.com", password, confirm: password });

    expect(result).toEqual({ ok: true });
    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0]).toEqual({
      level: "info",
      fields: JSON.stringify({ userId: "user-1" }),
      message: "account created",
    });
    expect(logger.allText()).not.toContain(password);
    expect(logger.allText()).not.toContain("dan@example.com");
  });
});
