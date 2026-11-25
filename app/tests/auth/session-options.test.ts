import { describe, expect, it } from "vitest";
import { sessionOptions } from "../../src/auth/session-options";
import { SESSION_MAX_AGE_SECONDS } from "../../src/domain/session-age";
import type { AppConfig } from "../../src/lib/config";

const devConfig: AppConfig = {
  sessionSecret: "x".repeat(32),
  databaseUrl: "./data/test.db",
  isProduction: false,
};

const prodConfig: AppConfig = { ...devConfig, isProduction: true };

describe("sessionOptions", () => {
  it("F1.AC8 cookie options have no expires and no maxAge", () => {
    const options = sessionOptions(devConfig);
    const cookie = options.cookieOptions ?? {};

    expect("expires" in cookie).toBe(false);
    expect("maxAge" in cookie).toBe(false);
    expect(options.cookieOptions?.expires).toBeUndefined();
    expect(options.cookieOptions?.maxAge).toBeUndefined();
    expect(sessionOptions(prodConfig).cookieOptions).not.toHaveProperty("maxAge");
    expect(sessionOptions(prodConfig).cookieOptions).not.toHaveProperty("expires");
  });

  it("F1.AC8 cookie is httpOnly", () => {
    const options = sessionOptions(devConfig);

    expect(options.cookieOptions?.httpOnly).toBe(true);
    expect(options.cookieOptions?.sameSite).toBe("lax");
    expect(options.cookieOptions?.path).toBe("/");
    expect(options.cookieName).toBe("trip_session");
    expect(options.password).toBe(devConfig.sessionSecret);
    expect(sessionOptions(devConfig).cookieOptions?.secure).toBe(false);
    expect(sessionOptions(prodConfig).cookieOptions?.secure).toBe(true);
  });

  it("F1.AC14 sets the iron-session ttl to 14 days", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(1209600);
    expect(sessionOptions(devConfig).ttl).toBe(1209600);
  });
});
