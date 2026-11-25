import { describe, expect, it } from "vitest";
import { safeReturnTarget } from "../../src/domain/return-target";

describe("safeReturnTarget", () => {
  it("F1.AC9 keeps an in-app path with a query string", () => {
    expect(safeReturnTarget("/trips/abc123?tab=expenses&sort=date")).toBe(
      "/trips/abc123?tab=expenses&sort=date",
    );
  });

  it("F1.AC10 drops an absolute https address", () => {
    expect(safeReturnTarget("https://evil.example.com/steal")).toBe("/trips");
  });

  it("F1.AC10 drops a protocol-relative address", () => {
    expect(safeReturnTarget("//evil.example.com/steal")).toBe("/trips");
  });

  it("F1.AC10 drops a backslash address", () => {
    expect(safeReturnTarget("/\\evil.example.com")).toBe("/trips");
    expect(safeReturnTarget("/trips\\..\\admin")).toBe("/trips");
  });

  it("F1.AC10 drops a non-string value", () => {
    expect(safeReturnTarget(undefined)).toBe("/trips");
    expect(safeReturnTarget(null)).toBe("/trips");
    expect(safeReturnTarget(42)).toBe("/trips");
    expect(safeReturnTarget({ path: "/trips" })).toBe("/trips");
  });

  it("F1.AC10 drops a path that does not start with a slash", () => {
    expect(safeReturnTarget("trips/abc")).toBe("/trips");
    expect(safeReturnTarget("")).toBe("/trips");
  });

  it("F1.AC10 drops a path containing a control character", () => {
    expect(safeReturnTarget("/trips\r\nSet-Cookie: x=1")).toBe("/trips");
    expect(safeReturnTarget("/trips\u0000")).toBe("/trips");
    expect(safeReturnTarget("/trips\u007f")).toBe("/trips");
  });

  it("F1.AC10 drops a path with a scheme separator", () => {
    expect(safeReturnTarget("/redirect?to=https://evil.example.com")).toBe("/trips");
  });

  it("F1.AC10 drops a path longer than 2048 characters", () => {
    const tooLong = "/" + "a".repeat(2048);
    expect(safeReturnTarget(tooLong)).toBe("/trips");
  });

  it("F1.AC9 keeps a path of exactly 2048 characters", () => {
    const maxLength = "/" + "a".repeat(2047);
    expect(safeReturnTarget(maxLength)).toBe(maxLength);
  });
});
