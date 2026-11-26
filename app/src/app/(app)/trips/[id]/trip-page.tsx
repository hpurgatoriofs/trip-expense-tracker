"use client";

// Trip page body (F2.AC8, F2.AC9, F2.AC10, F2.AC11, F2.AC16). Fetches GET /api/trips/<id> and shows
// the state chosen by tripPageState(). A 404 is "Trip not found.", never a failure. Any other
// failure shows the failed message with Try again, which fetches the trip again and shows loading
// while it does. A 401 sends the user to the login page with this page as the return target (F1.R9).
// Delete trip opens a native dialog. Only a confirmed choice sends DELETE. Success goes to the list.
// Focus returns to Delete trip when the dialog closes.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DeleteTripDialog } from "./delete-trip-dialog";
import {
  BACK_TO_TRIPS_BUTTON,
  DELETE_FAILED_MESSAGE,
  DELETE_TRIP_BUTTON,
  TRIP_FAILED_MESSAGE,
  TRIP_LOADING_MESSAGE,
  TRIP_NOT_FOUND_BODY,
  TRIP_NOT_FOUND_HEADING,
  TRY_AGAIN_BUTTON,
} from "@/domain/trip-messages";
import {
  deleteDialogChoice,
  tripPageState,
  type DeleteDialogChoice,
  type TripRequest,
  type TripSummary,
} from "@/domain/trip-view";

type FetchOutcome =
  | { status: "loaded"; trip: TripSummary }
  | { status: "not_found" }
  | { status: "failed" }
  | { status: "login" };

function isTripSummary(value: unknown): value is TripSummary {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<Record<keyof TripSummary, unknown>>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.createdAt === "string"
  );
}

async function fetchTrip(tripId: string): Promise<FetchOutcome> {
  let response: Response;
  try {
    response = await fetch(`/api/trips/${encodeURIComponent(tripId)}`, { cache: "no-store" });
  } catch {
    return { status: "failed" };
  }
  if (response.status === 401) {
    return { status: "login" };
  }
  if (response.status === 404) {
    return { status: "not_found" };
  }
  if (!response.ok) {
    return { status: "failed" };
  }
  try {
    const body = (await response.json()) as { trip?: unknown };
    if (!isTripSummary(body.trip)) {
      return { status: "failed" };
    }
    return { status: "loaded", trip: body.trip };
  } catch {
    return { status: "failed" };
  }
}

type DeleteOutcome = "deleted" | "failed" | "login";

async function sendDelete(tripId: string): Promise<DeleteOutcome> {
  let response: Response;
  try {
    response = await fetch(`/api/trips/${encodeURIComponent(tripId)}`, { method: "DELETE" });
  } catch {
    return "failed";
  }
  if (response.status === 401) {
    return "login";
  }
  return response.ok ? "deleted" : "failed";
}

export function TripPage({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [request, setRequest] = useState<TripRequest<TripSummary>>("loading");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  // A ref guards against a second confirm before the disabled state renders.
  const deletingRef = useRef(false);

  const load = useCallback(async () => {
    setRequest("loading");
    const outcome = await fetchTrip(tripId);
    if (outcome.status === "login") {
      window.location.assign(`/login?next=/trips/${encodeURIComponent(tripId)}`);
      return;
    }
    if (outcome.status === "loaded") {
      setRequest({ status: "loaded", trip: outcome.trip });
      return;
    }
    setRequest(outcome.status);
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openDialog() {
    setDeleteError(null);
    dialogRef.current?.showModal();
  }

  function handleClosed() {
    deleteButtonRef.current?.focus();
  }

  async function handleChoose(choice: DeleteDialogChoice) {
    if (!deleteDialogChoice(choice).callDelete) {
      dialogRef.current?.close();
      return;
    }
    if (deletingRef.current) {
      return;
    }
    deletingRef.current = true;
    setDeleting(true);
    setDeleteError(null);

    const outcome = await sendDelete(tripId);
    if (outcome === "login") {
      window.location.assign(`/login?next=/trips/${encodeURIComponent(tripId)}`);
      return;
    }
    if (outcome === "failed") {
      deletingRef.current = false;
      setDeleting(false);
      setDeleteError(DELETE_FAILED_MESSAGE);
      return;
    }
    // Stays disabled ("Deleting…") while the app navigates to the list.
    router.push("/trips");
  }

  const state = tripPageState(request);

  if (state === "loading") {
    return <p role="status">{TRIP_LOADING_MESSAGE}</p>;
  }

  if (state === "not_found") {
    return (
      <div>
        <h1>{TRIP_NOT_FOUND_HEADING}</h1>
        <p>{TRIP_NOT_FOUND_BODY}</p>
        <button type="button" onClick={() => router.push("/trips")}>
          {BACK_TO_TRIPS_BUTTON}
        </button>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div>
        <p role="alert">{TRIP_FAILED_MESSAGE}</p>
        <button type="button" onClick={() => void load()}>
          {TRY_AGAIN_BUTTON}
        </button>
      </div>
    );
  }

  if (state === "loaded" && typeof request === "object") {
    const trip = request.trip;
    return (
      <div>
        <h1>{trip.name}</h1>
        <button type="button" ref={deleteButtonRef} onClick={openDialog}>
          {DELETE_TRIP_BUTTON}
        </button>
        <DeleteTripDialog
          dialogRef={dialogRef}
          tripName={trip.name}
          deleting={deleting}
          errorMessage={deleteError}
          onChoose={(choice) => void handleChoose(choice)}
          onClosed={handleClosed}
        />
      </div>
    );
  }

  return null;
}
