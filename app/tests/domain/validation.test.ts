import { describe, expect, it } from "vitest";
import {
  isValidEmail,
  normalizeEmail,
  passwordLength,
  validateRegistration,
} from "../../src/domain/validation";

const VALID_EMAIL = "traveller@example.com";

describe("validateRegistration password length", () => {
  it("F1.AC2 refuses a password of 7 characters", () => {
    const result = validateRegistration({
      email: VALID_EMAIL,
      password: "a".repeat(7),
      confirm: "a".repeat(7),
    });
    expect(result).toEqual({
      ok: false,
      errors: [{ field: "password", code: "password_length" }],
    });
  });

  it("F1.AC2 refuses a password of 73 characters", () => {
    const result = validateRegistration({
      email: VALID_EMAIL,
      password: "a".repeat(73),
      confirm: "a".repeat(73),
    });
    expect(result).toEqual({
      ok: false,
      errors: [{ field: "password", code: "password_length" }],
    });
  });

  it("F1.AC2 accepts passwords of 8 and 72 characters", () => {
    for (const length of [8, 72]) {
      const password = "b".repeat(length);
      const result = validateRegistration({ email: VALID_EMAIL, password, confirm: password });
      expect(result).toEqual({ ok: true, email: VALID_EMAIL, password });
    }
  });

  it("F1.AC2 counts spaces as characters", () => {
    expect(passwordLength("a       b")).toBe(9);
    const password = "        ";
    const result = validateRegistration({ email: VALID_EMAIL, password, confirm: password });
    expect(result.ok).toBe(true);
  });

  it("F1.AC2 counts an emoji as one character", () => {
    expect(passwordLength("😀".repeat(8))).toBe(8);
  });
});

describe("validateRegistration confirmation", () => {
  it("F1.AC3 refuses a mismatched confirmation", () => {
    const result = validateRegistration({
      email: VALID_EMAIL,
      password: "correct-horse",
      confirm: "correct-hors3",
    });
    expect(result).toEqual({
      ok: false,
      errors: [{ field: "confirm", code: "password_mismatch" }],
    });
  });

  it("F1.AC3 treats trailing spaces as a difference", () => {
    const result = validateRegistration({
      email: VALID_EMAIL,
      password: "correct-horse",
      confirm: "correct-horse ",
    });
    expect(result).toEqual({
      ok: false,
      errors: [{ field: "confirm", code: "password_mismatch" }],
    });
  });
});

describe("email validation", () => {
  it("F1.AC13 rejects an email without an @ or domain", () => {
    expect(isValidEmail("traveller.example.com")).toBe(false);
    expect(isValidEmail("traveller@example")).toBe(false);
    expect(isValidEmail("traveller@")).toBe(false);

    const result = validateRegistration({
      email: "traveller.example.com",
      password: "correct-horse",
      confirm: "correct-horse",
    });
    expect(result).toEqual({
      ok: false,
      errors: [{ field: "email", code: "invalid_email" }],
    });
  });

  it("F1.AC13 normalises a mixed-case email to lowercase", () => {
    expect(normalizeEmail("  Traveller@Example.COM  ")).toBe(VALID_EMAIL);
    const result = validateRegistration({
      email: "  Traveller@Example.COM ",
      password: "correct-horse",
      confirm: "correct-horse",
    });
    expect(result).toEqual({
      ok: true,
      email: VALID_EMAIL,
      password: "correct-horse",
    });
  });
});

describe("validateRegistration required fields", () => {
  it("reports required for missing or empty fields", () => {
    const result = validateRegistration({ email: "", password: undefined, confirm: "" });
    expect(result).toEqual({
      ok: false,
      errors: [
        { field: "email", code: "required" },
        { field: "password", code: "required" },
        { field: "confirm", code: "required" },
      ],
    });
  });
});
