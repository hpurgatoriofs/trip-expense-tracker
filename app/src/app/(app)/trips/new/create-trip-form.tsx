"use client";

// Create trip form (F2.AC1 to F2.AC4, F2.R2, F2.R3). Checks the name with the same pure rule as the
// server (validateTripName) before any request, so the user sees the field error first. The server
// check stays the source of truth: its field error is shown with the same copy. A failed request
// keeps the typed name. The error is linked to the field with aria-describedby, and focus goes to
// the field after an error. A ref guards against a double submit, because the disabled button only
// takes effect after the next render.

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { validateTripName } from "@/domain/trip-name";
import {
  CREATE_TRIP_BUTTON,
  SAVING_BUTTON,
  TRIP_NAME_BLANK_MESSAGE,
  TRIP_NAME_TOO_LONG_MESSAGE,
  TRIP_SAVE_FAILED_MESSAGE,
} from "@/domain/trip-messages";

const NAME_ERROR_ID = "create-trip-name-error";

type ServerNameErrorCode = "blank_name" | "name_too_long";

const SERVER_NAME_ERRORS: Record<ServerNameErrorCode, string> = {
  blank_name: TRIP_NAME_BLANK_MESSAGE,
  name_too_long: TRIP_NAME_TOO_LONG_MESSAGE,
};

function serverNameErrorMessage(body: unknown): string {
  const error = (body as { error?: { code?: unknown; field?: unknown } } | null)?.error;
  if (error?.field === "name" && typeof error.code === "string" && error.code in SERVER_NAME_ERRORS) {
    return SERVER_NAME_ERRORS[error.code as ServerNameErrorCode];
  }
  return TRIP_SAVE_FAILED_MESSAGE;
}

export function CreateTripForm() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Shows the error, keeps the typed name, and moves focus back to the field.
  function fail(message: string) {
    submittingRef.current = false;
    setSubmitting(false);
    setErrorMessage(message);
    nameRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const data = new FormData(event.currentTarget);
    const check = validateTripName(String(data.get("name") ?? ""));
    if (!check.ok) {
      fail(check.code === "blank_name" ? TRIP_NAME_BLANK_MESSAGE : TRIP_NAME_TOO_LONG_MESSAGE);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrorMessage(null);

    let response: Response;
    try {
      response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: check.name }),
      });
    } catch {
      fail(TRIP_SAVE_FAILED_MESSAGE);
      return;
    }

    if (response.status === 401) {
      window.location.assign("/login?next=/trips/new");
      return;
    }

    if (!response.ok) {
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      fail(serverNameErrorMessage(body));
      return;
    }

    let tripId: unknown;
    try {
      tripId = ((await response.json()) as { trip?: { id?: unknown } }).trip?.id;
    } catch {
      fail(TRIP_SAVE_FAILED_MESSAGE);
      return;
    }
    if (typeof tripId !== "string" || tripId === "") {
      fail(TRIP_SAVE_FAILED_MESSAGE);
      return;
    }
    // The button stays disabled while the app navigates, so a second submit cannot start.
    router.push(`/trips/${encodeURIComponent(tripId)}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="create-trip-name">Trip name</label>
      <input
        ref={nameRef}
        id="create-trip-name"
        name="name"
        type="text"
        autoComplete="off"
        required
        aria-invalid={errorMessage !== null ? true : undefined}
        aria-describedby={errorMessage !== null ? NAME_ERROR_ID : undefined}
      />
      {errorMessage !== null ? <p id={NAME_ERROR_ID}>{errorMessage}</p> : null}

      <button type="submit" disabled={submitting}>
        {submitting ? SAVING_BUTTON : CREATE_TRIP_BUTTON}
      </button>
    </form>
  );
}
