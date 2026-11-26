"use client";

// Log in form (F1.AC5, F1.AC6, F1.AC9). The failure message is the same for an unknown email and
// a wrong password (F1.R6). The server picks the redirect target; the client only follows it.

import { useRef, useState, type FormEvent } from "react";
import { loginFailureMessage } from "@/domain/auth-messages";

const GENERIC_ERROR = "Something went wrong. Try again.";

type LoginFormProps = {
  next?: string;
};

export function LoginForm({ next }: LoginFormProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function fail(text: string) {
    setSubmitting(false);
    setMessage(text);
    emailRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    let response: Response;
    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
    } catch {
      fail(GENERIC_ERROR);
      return;
    }

    if (response.status === 401) {
      fail(loginFailureMessage());
      return;
    }
    if (!response.ok) {
      fail(GENERIC_ERROR);
      return;
    }

    let redirectTo: unknown;
    try {
      redirectTo = ((await response.json()) as { redirectTo?: unknown }).redirectTo;
    } catch {
      fail(GENERIC_ERROR);
      return;
    }
    if (typeof redirectTo !== "string") {
      fail(GENERIC_ERROR);
      return;
    }
    // The button stays disabled while the browser navigates, so a second submit cannot start.
    window.location.assign(redirectTo);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div role="alert">{message}</div>

      <label htmlFor="login-email">Email</label>
      <input
        ref={emailRef}
        id="login-email"
        name="email"
        type="email"
        autoComplete="email"
        required
      />

      <label htmlFor="login-password">Password</label>
      <input
        id="login-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      <button type="submit" disabled={submitting}>
        Log in
      </button>
    </form>
  );
}
