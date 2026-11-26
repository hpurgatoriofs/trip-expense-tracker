"use client";

// Logout button (F1.AC7). Posts to the logout route, then loads the login page with the
// logged-out notice. A full page load (not a client-side route change) drops anything the
// router cached while the user was logged in.

import { useState } from "react";

const GENERIC_ERROR = "Something went wrong. Try again.";

export function LogoutButton() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);

    let response: Response;
    try {
      response = await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      setSubmitting(false);
      setMessage(GENERIC_ERROR);
      return;
    }

    if (!response.ok) {
      setSubmitting(false);
      setMessage(GENERIC_ERROR);
      return;
    }

    window.location.assign("/login?loggedOut=1");
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={submitting}>
        Log out
      </button>
      {message ? <p role="alert">{message}</p> : null}
    </>
  );
}
