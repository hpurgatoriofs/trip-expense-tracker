import { describe, expect, it } from "vitest";
import { FakeLogger } from "../fakes/fake-logger";
import { FakeSessionStore } from "../fakes/fake-session-store";
import { logout } from "../../src/services/logout";
import { requireUser } from "../../src/services/require-user";

const LOGGED_IN = "2026-11-01T12:00:00.000Z";
const DAY_MS = 24 * 60 * 60 * 1000;

function at(days: number): () => Date {
  return () => new Date(Date.parse(LOGGED_IN) + days * DAY_MS);
}

describe("logout and access check", () => {
  it("F1.AC7 logout ends the session so the access check then refuses", async () => {
    const session = new FakeSessionStore();
    const logger = new FakeLogger();
    await session.start("user-1", LOGGED_IN);

    const result = await logout({ session, logger });
    expect(result).toEqual({ ok: true });
    expect(session.session).toBeNull();

    const access = await requireUser({ session, now: at(0) });
    expect(access).toEqual({ ok: false, error: "not_logged_in" });
  });

  it("F1.AC7 logout with no session still succeeds", async () => {
    const session = new FakeSessionStore();
    const logger = new FakeLogger();

    const result = await logout({ session, logger });
    expect(result).toEqual({ ok: true });
    expect(session.session).toBeNull();
  });

  it("F1.AC11 requireUser refuses a request with no session", async () => {
    const session = new FakeSessionStore();

    const result = await requireUser({ session, now: at(0) });
    expect(result).toEqual({ ok: false, error: "not_logged_in" });
  });

  it("F1.AC14 requireUser refuses a session 14 days after login", async () => {
    const session = new FakeSessionStore();
    await session.start("user-1", LOGGED_IN);

    const result = await requireUser({ session, now: at(14) });
    expect(result).toEqual({ ok: false, error: "not_logged_in" });
  });

  it("F1.AC14 requireUser accepts a session 13 days after login", async () => {
    const session = new FakeSessionStore();
    await session.start("user-1", LOGGED_IN);

    const result = await requireUser({ session, now: at(13) });
    expect(result).toEqual({ ok: true, userId: "user-1" });
  });
});
