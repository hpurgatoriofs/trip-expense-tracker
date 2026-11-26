"use client";

// Register form (F1.AC1 to F1.AC4, F1.AC13). Checks the fields with the same pure rules as the
// server (validateRegistration), then posts. Field errors come from auth-messages.ts, are linked
// to their input with aria-describedby, and focus goes to the first errored field.

import { useRef, useState, type FormEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { authErrorMessage, type AuthErrorCode } from "@/domain/auth-messages";
import { validateRegistration, type ValidationError } from "@/domain/validation";

const GENERIC_ERROR = "Something went wrong. Try again.";

type FieldName = "email" | "password" | "confirm";
type FieldErrors = Partial<Record<FieldName, AuthErrorCode>>;

// Order in which fields are checked and focused.
const FIELD_ORDER: FieldName[] = ["email", "password", "confirm"];

const KNOWN_CODES: AuthErrorCode[] = [
  "required",
  "invalid_email",
  "password_mismatch",
  "password_length",
  "email_taken",
  "invalid_credentials",
];

function isFieldName(value: unknown): value is FieldName {
  return typeof value === "string" && (FIELD_ORDER as string[]).includes(value);
}

function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return typeof value === "string" && (KNOWN_CODES as string[]).includes(value);
}

function errorsFromList(list: ValidationError[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const item of list) {
    errors[item.field] ??= item.code;
  }
  return errors;
}

export function RegisterForm() {
  const router = useRouter();
  const refs: Record<FieldName, RefObject<HTMLInputElement | null>> = {
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    confirm: useRef<HTMLInputElement>(null),
  };
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  // Shows the errors, announces the first one, and moves focus to its field.
  function fail(errors: FieldErrors, fallback: string = GENERIC_ERROR) {
    setSubmitting(false);
    setFieldErrors(errors);
    const first = FIELD_ORDER.find((field) => errors[field] !== undefined);
    if (first === undefined) {
      setMessage(fallback);
      return;
    }
    setMessage(authErrorMessage(errors[first] as AuthErrorCode));
    refs[first].current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFieldErrors({});
    setMessage(null);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    const check = validateRegistration({ email, password, confirm });
    if (!check.ok) {
      fail(errorsFromList(check.errors));
      return;
    }

    let response: Response;
    try {
      response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirm }),
      });
    } catch {
      fail({});
      return;
    }

    if (response.ok) {
      // The button stays disabled while the app navigates, so a second submit cannot start.
      router.push("/login");
      return;
    }

    if (response.status === 409) {
      fail({ email: "email_taken" });
      return;
    }

    let error: { code?: unknown; field?: unknown } | undefined;
    try {
      error = ((await response.json()) as { error?: typeof error }).error;
    } catch {
      fail({});
      return;
    }
    if (isFieldName(error?.field) && isAuthErrorCode(error?.code)) {
      fail({ [error.field]: error.code });
      return;
    }
    fail({});
  }

  const describedBy = (field: FieldName) => (fieldErrors[field] ? `register-${field}-error` : undefined);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div role="alert">{message}</div>

      <label htmlFor="register-email">Email</label>
      <input
        ref={refs.email}
        id="register-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        aria-invalid={fieldErrors.email ? true : undefined}
        aria-describedby={describedBy("email")}
      />
      {fieldErrors.email ? (
        <p id="register-email-error">{authErrorMessage(fieldErrors.email)}</p>
      ) : null}

      <label htmlFor="register-password">Password</label>
      <input
        ref={refs.password}
        id="register-password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        aria-invalid={fieldErrors.password ? true : undefined}
        aria-describedby={describedBy("password")}
      />
      {fieldErrors.password ? (
        <p id="register-password-error">{authErrorMessage(fieldErrors.password)}</p>
      ) : null}

      <label htmlFor="register-confirm">Password again</label>
      <input
        ref={refs.confirm}
        id="register-confirm"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        aria-invalid={fieldErrors.confirm ? true : undefined}
        aria-describedby={describedBy("confirm")}
      />
      {fieldErrors.confirm ? (
        <p id="register-confirm-error">{authErrorMessage(fieldErrors.confirm)}</p>
      ) : null}

      <button type="submit" disabled={submitting}>
        Create account
      </button>
    </form>
  );
}
