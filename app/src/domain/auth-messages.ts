/**
 * Approved copy for registration, login and logout (spec F1, States & errors).
 * Pure: no imports from db/, next/, iron-session or @node-rs/argon2.
 */

export type AuthErrorCode =
  | "required"
  | "invalid_email"
  | "password_mismatch"
  | "password_length"
  | "email_taken"
  | "invalid_credentials";

const MESSAGES: Record<AuthErrorCode, string> = {
  required: "This field is required.",
  invalid_email: "Enter an email address like name@example.com.",
  password_mismatch: "The passwords don't match.",
  password_length: "Password must be 8 to 72 characters.",
  email_taken: "That email is already registered.",
  invalid_credentials: "Email or password is incorrect.",
};

const LOGGED_OUT_NOTICE = "You are logged out.";

/** Returns the approved copy for an error code. */
export function authErrorMessage(code: AuthErrorCode): string {
  return MESSAGES[code];
}

/**
 * Returns the single login failure message (F1.AC6, F1.R6).
 * It takes no argument, so it cannot vary by cause (unknown email or wrong password).
 */
export function loginFailureMessage(): string {
  return MESSAGES.invalid_credentials;
}

/** Returns the notice shown on the login page after logout. */
export function loggedOutNotice(): string {
  return LOGGED_OUT_NOTICE;
}
