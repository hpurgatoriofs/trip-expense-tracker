import { describe, expect, it } from "vitest";
import { parseConfig } from "../../src/lib/config";

const LONG_SECRET = "a".repeat(32);

describe("parseConfig", () => {
  it("F1.AC8 refuses a SESSION_SECRET under 32 characters", () => {
    expect(() =>
      parseConfig({ SESSION_SECRET: "a".repeat(31), DATABASE_URL: "./data/app.db" }),
    ).toThrow(/SESSION_SECRET/);
  });

  it("F1.AC8 refuses a missing SESSION_SECRET", () => {
    expect(() => parseConfig({ DATABASE_URL: "./data/app.db" })).toThrow(/SESSION_SECRET/);
  });

  it("F1.AC8 accepts a SESSION_SECRET of exactly 32 characters", () => {
    const config = parseConfig({ SESSION_SECRET: LONG_SECRET, DATABASE_URL: "./data/app.db" });
    expect(config.sessionSecret).toBe(LONG_SECRET);
  });

  it("F1.AC8 refuses an empty DATABASE_URL", () => {
    expect(() => parseConfig({ SESSION_SECRET: LONG_SECRET, DATABASE_URL: "" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("F1.AC8 sets isProduction only when NODE_ENV is production", () => {
    const base = { SESSION_SECRET: LONG_SECRET, DATABASE_URL: "./data/app.db" };
    expect(parseConfig({ ...base, NODE_ENV: "production" }).isProduction).toBe(true);
    expect(parseConfig({ ...base, NODE_ENV: "development" }).isProduction).toBe(false);
  });
});
