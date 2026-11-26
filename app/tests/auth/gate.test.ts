import { describe, expect, it } from "vitest";
import { isProtectedPath, loginRedirect } from "../../src/auth/gate";

describe("protected-path rule", () => {
  it("F1.AC7 a logged-out request to a protected page gets a login redirect", () => {
    expect(isProtectedPath("/trips")).toBe(true);
    expect(isProtectedPath("/trips/abc123")).toBe(true);
    expect(loginRedirect("/trips", "")).toBe("/login?next=%2Ftrips");
  });

  it("F1.AC9 the login redirect keeps the requested path and query in next", () => {
    expect(loginRedirect("/trips/abc123", "?tab=people")).toBe(
      "/login?next=%2Ftrips%2Fabc123%3Ftab%3Dpeople",
    );
    expect(loginRedirect("/trips", "?a=1&b=2")).toBe(
      "/login?next=" + encodeURIComponent("/trips?a=1&b=2"),
    );
  });

  it("F1.AC9 register and login pages are not protected", () => {
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/register")).toBe(false);
  });

  it("F1.AC9 auth route handlers and static assets are not protected", () => {
    expect(isProtectedPath("/api/auth/login")).toBe(false);
    expect(isProtectedPath("/api/auth/logout")).toBe(false);
    expect(isProtectedPath("/_next/static/chunks/main.js")).toBe(false);
    expect(isProtectedPath("/_next/image")).toBe(false);
  });

  it("F1.AC9 paths that only look like public pages are still protected", () => {
    expect(isProtectedPath("/loginx")).toBe(true);
    expect(isProtectedPath("/registered-trips")).toBe(true);
    expect(isProtectedPath("/api/trips")).toBe(false);
  });

  it("F2.AC12 trip API paths are left to the handler", () => {
    expect(isProtectedPath("/api/trips")).toBe(false);
    expect(isProtectedPath("/api/trips/abc123")).toBe(false);
    expect(isProtectedPath("/api/trips/abc123/expenses")).toBe(false);
  });

  it("F2.AC12 page paths are still protected", () => {
    expect(isProtectedPath("/")).toBe(true);
    expect(isProtectedPath("/trips")).toBe(true);
    expect(isProtectedPath("/trips/abc123")).toBe(true);
    expect(isProtectedPath("/apis")).toBe(true);
    expect(isProtectedPath("/api-docs")).toBe(true);
  });
});
