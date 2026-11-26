import { describe, expect, it } from "vitest";
import { validateTripName } from "../../src/domain/trip-name";

describe("validateTripName", () => {
  it("F2.AC1 accepts a name of 1 character", () => {
    expect(validateTripName("A")).toEqual({ ok: true, name: "A" });
  });

  it("F2.AC2 refuses an empty name", () => {
    expect(validateTripName("")).toEqual({ ok: false, code: "blank_name" });
  });

  it("F2.AC2 refuses a name of only spaces", () => {
    expect(validateTripName("     ")).toEqual({ ok: false, code: "blank_name" });
  });

  it("F2.AC2 refuses a name that is not a string", () => {
    expect(validateTripName(undefined)).toEqual({ ok: false, code: "blank_name" });
    expect(validateTripName(null)).toEqual({ ok: false, code: "blank_name" });
    expect(validateTripName(42)).toEqual({ ok: false, code: "blank_name" });
  });

  it("F2.AC3 accepts a name of exactly 100 characters", () => {
    const name = "a".repeat(100);
    expect(validateTripName(name)).toEqual({ ok: true, name });
  });

  it("F2.AC3 refuses a name of 101 characters", () => {
    expect(validateTripName("a".repeat(101))).toEqual({
      ok: false,
      code: "name_too_long",
    });
  });

  it("F2.AC3 counts code points, so 100 emoji are accepted and 101 are refused", () => {
    const ok = "😀".repeat(100);
    expect(validateTripName(ok)).toEqual({ ok: true, name: ok });
    expect(validateTripName("😀".repeat(101))).toEqual({
      ok: false,
      code: "name_too_long",
    });
  });

  it("F2.AC3 checks the length after trimming", () => {
    const name = "a".repeat(100);
    expect(validateTripName(`   ${name}   `)).toEqual({ ok: true, name });
  });

  it("F2.AC4 removes leading and trailing spaces", () => {
    expect(validateTripName("  Lisbon trip  ")).toEqual({
      ok: true,
      name: "Lisbon trip",
    });
  });

  it("F2.AC4 keeps spaces inside the name", () => {
    expect(validateTripName(" Road  trip to Porto ")).toEqual({
      ok: true,
      name: "Road  trip to Porto",
    });
  });
});
