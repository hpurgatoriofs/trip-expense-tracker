import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE_SECONDS, isSessionExpired } from "../../src/domain/session-age";

const LOGGED_IN = "2026-11-01T12:00:00.000Z";
const DAY_MS = 24 * 60 * 60 * 1000;

describe("session age", () => {
  it("F1.AC14 isSessionExpired is false at 13 days", () => {
    const now = new Date(Date.parse(LOGGED_IN) + 13 * DAY_MS);
    expect(isSessionExpired(LOGGED_IN, now)).toBe(false);
  });

  it("F1.AC14 isSessionExpired is true at 14 days", () => {
    const now = new Date(Date.parse(LOGGED_IN) + 14 * DAY_MS);
    expect(isSessionExpired(LOGGED_IN, now)).toBe(true);
  });

  it("F1.AC14 the max age constant is 14 days in seconds", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(1209600);
  });
});
