// Pure validation functions (R1, F1.R2, F1.R3). No imports from db/, next/, iron-session or @node-rs/argon2.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidationErrorCode = "required" | "invalid_email" | "password_length" | "password_mismatch";

export type ValidationError = {
  field: "email" | "password" | "confirm";
  code: ValidationErrorCode;
};

export type RegistrationInput = {
  email?: string | null;
  password?: string | null;
  confirm?: string | null;
};

export type RegistrationResult =
  | { ok: true; email: string; password: string }
  | { ok: false; errors: ValidationError[] };

/** Trims surrounding spaces and lowercases the email. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Basic `name@domain` format check. */
export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

/** Counts code points, so an emoji counts as one character. */
export function passwordLength(pw: string): number {
  return [...pw].length;
}

/**
 * Validates a registration form. Passwords are never trimmed.
 * A missing or empty field gives `required`. Password length is checked only when present.
 * Mismatch is an exact string comparison.
 */
export function validateRegistration(input: RegistrationInput): RegistrationResult {
  const errors: ValidationError[] = [];
  const rawEmail = input.email ?? "";
  const password = input.password ?? "";
  const confirm = input.confirm ?? "";

  const email = normalizeEmail(rawEmail);
  if (email === "") {
    errors.push({ field: "email", code: "required" });
  } else if (!isValidEmail(email)) {
    errors.push({ field: "email", code: "invalid_email" });
  }

  if (password === "") {
    errors.push({ field: "password", code: "required" });
  } else {
    const length = passwordLength(password);
    if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) {
      errors.push({ field: "password", code: "password_length" });
    }
  }

  if (confirm === "") {
    errors.push({ field: "confirm", code: "required" });
  } else if (password !== "" && confirm !== password) {
    errors.push({ field: "confirm", code: "password_mismatch" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, email, password };
}
