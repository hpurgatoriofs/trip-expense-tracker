import { describe, expect, it, vi } from "vitest";
import { login, type LoginDeps } from "../../src/services/login";
import { FakeHasher } from "../fakes/fake-password-hasher";
import { FakeLogger } from "../fakes/fake-logger";
import { FakeSessionStore } from "../fakes/fake-session-store";
import { InMemoryUserStore } from "../fakes/in-memory-user-store";

const FIXED_NOW = new Date("2026-01-01T09:30:00.000Z");
const PASSWORD = "correct horse battery";

async function makeDeps(overrides: Partial<LoginDeps> = {}) {
  const users = new InMemoryUserStore();
  const hasher = new FakeHasher();
  const session = new FakeSessionStore();
  const logger = new FakeLogger();
  const deps: LoginDeps = {
    users,
    hasher,
    session,
    logger,
    now: () => FIXED_NOW,
    ...overrides,
  };
  await users.create({
    id: "user-1",
    email: "alice@example.com",
    passwordHash: await hasher.hash(PASSWORD),
    createdAt: FIXED_NOW,
  });
  return { deps, users, hasher, session, logger };
}

describe("login", () => {
  it("F1.AC5 starts a session for correct credentials", async () => {
    const { deps, session } = await makeDeps();

    const result = await login(deps, { email: "alice@example.com", password: PASSWORD });

    expect(result).toEqual({ ok: true, userId: "user-1" });
    expect(session.session?.userId).toBe("user-1");
  });

  it("F1.AC5 normalises the email before looking it up", async () => {
    const { deps, session } = await makeDeps();

    const result = await login(deps, { email: "  Alice@Example.com ", password: PASSWORD });

    expect(result).toEqual({ ok: true, userId: "user-1" });
    expect(session.session).not.toBeNull();
  });

  it("F1.AC6 unknown email and wrong password return the same result", async () => {
    const { deps } = await makeDeps();

    const unknownEmail = await login(deps, { email: "nobody@example.com", password: PASSWORD });
    const wrongPassword = await login(deps, { email: "alice@example.com", password: "wrong password" });

    expect(unknownEmail).toEqual({ ok: false, error: "invalid_credentials" });
    expect(wrongPassword).toEqual(unknownEmail);
  });

  it("F1.AC6 an unknown email starts no session", async () => {
    const { deps, session } = await makeDeps();

    await login(deps, { email: "nobody@example.com", password: PASSWORD });

    expect(session.session).toBeNull();
  });

  it("F1.AC6 a wrong password starts no session", async () => {
    const { deps, session } = await makeDeps();

    await login(deps, { email: "alice@example.com", password: "wrong password" });

    expect(session.session).toBeNull();
  });

  it("F1.AC6 an unknown email still runs one hash verify", async () => {
    const { deps, hasher } = await makeDeps();
    const verifySpy = vi.spyOn(hasher, "verify");

    await login(deps, { email: "nobody@example.com", password: PASSWORD });

    expect(verifySpy).toHaveBeenCalledTimes(1);
    expect(verifySpy).toHaveBeenCalledWith(hasher.dummyHash, PASSWORD);
  });

  it("F1.AC14 records the login time from the injected clock", async () => {
    const { deps, session } = await makeDeps();

    await login(deps, { email: "alice@example.com", password: PASSWORD });

    expect(session.session?.loggedInAt).toBe("2026-01-01T09:30:00.000Z");
  });

  it("F1.AC14 a second login replaces the earlier session", async () => {
    let current = new Date("2026-01-01T09:30:00.000Z");
    const { deps, session } = await makeDeps({ now: () => current });

    await login(deps, { email: "alice@example.com", password: PASSWORD });
    current = new Date("2026-01-05T18:00:00.000Z");
    await login(deps, { email: "alice@example.com", password: PASSWORD });

    expect(session.session?.loggedInAt).toBe("2026-01-05T18:00:00.000Z");
  });

  it("F1.AC12 never passes the password to the logger", async () => {
    const { deps, logger } = await makeDeps();

    await login(deps, { email: "alice@example.com", password: PASSWORD });
    await login(deps, { email: "alice@example.com", password: "wrong password here" });
    await login(deps, { email: "nobody@example.com", password: "another secret value" });

    const text = logger.allText();
    expect(text).not.toContain(PASSWORD);
    expect(text).not.toContain("wrong password here");
    expect(text).not.toContain("another secret value");
  });

  it("F1.AC12 never logs the email on a failed login", async () => {
    const { deps, logger } = await makeDeps();

    await login(deps, { email: "nobody@example.com", password: PASSWORD });

    expect(logger.allText()).not.toContain("nobody@example.com");
    expect(logger.entries.some((e) => e.level === "warn")).toBe(true);
  });
});
