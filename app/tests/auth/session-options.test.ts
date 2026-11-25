import { describe, expect, it } from "vitest";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "../../src/auth/session-options";
import { SESSION_MAX_AGE_SECONDS } from "../../src/domain/session-age";
import type { AppConfig } from "../../src/lib/config";

const devConfig: AppConfig = {
  sessionSecret: "x".repeat(32),
  databaseUrl: "./data/test.db",
  isProduction: false,
};

const prodConfig: AppConfig = { ...devConfig, isProduction: true };

// A fake cookie store: records every cookie iron-session writes, with the options it passes.
function fakeCookieStore() {
  const written: { name: string; value: string; options: Record<string, unknown> }[] = [];
  return {
    written,
    get: () => undefined,
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      written.push({ name, value, options: options ?? {} });
    },
  };
}

describe("sessionOptions", () => {
  it("F1.AC8 saving a session writes a cookie with no Max-Age and no Expires", async () => {
    for (const config of [devConfig, prodConfig]) {
      const store = fakeCookieStore();
      const session = await getIronSession<SessionData>(store, sessionOptions(config));
      session.userId = "user-1";
      session.loggedInAt = new Date().toISOString();
      await session.save();

      expect(store.written).toHaveLength(1);
      const { options } = store.written[0];
      // undefined means the cookie serializer writes no Max-Age or Expires attribute.
      expect(options.maxAge).toBeUndefined();
      expect(options.expires).toBeUndefined();
    }
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
