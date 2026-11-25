import { describe, expect, it } from "vitest";
import {
  authErrorMessage,
  loggedOutNotice,
  loginFailureMessage,
} from "../../src/domain/auth-messages";

describe("auth messages", () => {
  it("F1.AC2 password length copy matches the approved text", () => {
    expect(authErrorMessage("password_length")).toBe(
      "Password must be 8 to 72 characters.",
    );
  });

  it("F1.AC3 mismatch copy matches the approved text", () => {
    expect(authErrorMessage("password_mismatch")).toBe(
      "The passwords don't match.",
    );
  });

  it("F1.AC4 email taken copy matches the approved text", () => {
    expect(authErrorMessage("email_taken")).toBe(
      "That email is already registered.",
    );
  });

  it("F1.AC6 login failure has one message with no argument", () => {
    expect(loginFailureMessage.length).toBe(0);
    expect(loginFailureMessage()).toBe("Email or password is incorrect.");
    expect(authErrorMessage("invalid_credentials")).toBe(
      "Email or password is incorrect.",
    );
    expect(loggedOutNotice()).toBe("You are logged out.");
  });
});
