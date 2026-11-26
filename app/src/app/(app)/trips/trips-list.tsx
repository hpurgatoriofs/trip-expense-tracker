"use client";

// Trips list (F2.AC6, F2.AC7, F2.AC15, F2.R6, F2.R7). Fetches GET /api/trips and shows the state
// chosen by listState(). A 401 sends the user to the login page with this page as the return
// target (F1.R9). Try again fetches the list again and shows the loading state while it does.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatTripDate, listState, type ListRequest, type TripSummary } from "@/domain/trip-view";
import {
  CREATE_TRIP_BUTTON,
  TRIPS_EMPTY_MESSAGE,
  TRIPS_FAILED_MESSAGE,
  TRIPS_LOADING_MESSAGE,
  TRY_AGAIN_BUTTON,
} from "@/domain/trip-messages";

type FetchOutcome = { status: "loaded"; trips: TripSummary[] } | { status: "failed" } | { status: "login" };

async function fetchTrips(): Promise<FetchOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/trips", { cache: "no-store" });
  } catch {
    return { status: "failed" };
  }
  if (response.status === 401) {
    return { status: "login" };
  }
  if (!response.ok) {
    return { status: "failed" };
  }
  try {
    const body = (await response.json()) as { trips?: unknown };
    if (!Array.isArray(body.trips)) {
      return { status: "failed" };
    }
    return { status: "loaded", trips: body.trips as TripSummary[] };
  } catch {
    return { status: "failed" };
  }
}

export function TripsList() {
  const [request, setRequest] = useState<ListRequest>({ status: "loading" });

  const load = useCallback(async () => {
    setRequest({ status: "loading" });
    const outcome = await fetchTrips();
    if (outcome.status === "login") {
      window.location.assign("/login?next=/trips");
      return;
    }
    if (outcome.status === "failed") {
      setRequest({ status: "failed" });
      return;
    }
    setRequest({ status: "loaded", trips: outcome.trips });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const state = listState(request);

  if (state === "loading") {
    return <p role="status">{TRIPS_LOADING_MESSAGE}</p>;
  }

  if (state === "failed") {
    return (
      <div>
        <p role="alert">{TRIPS_FAILED_MESSAGE}</p>
        <button type="button" onClick={() => void load()}>
          {TRY_AGAIN_BUTTON}
        </button>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div>
        <p>{TRIPS_EMPTY_MESSAGE}</p>
        <Link href="/trips/new">{CREATE_TRIP_BUTTON}</Link>
      </div>
    );
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <ul>
      {request.status === "loaded"
        ? request.trips.map((trip) => (
            <li key={trip.id}>
              <Link href={`/trips/${trip.id}`}>{trip.name}</Link>{" "}
              <time dateTime={trip.createdAt}>{formatTripDate(trip.createdAt, timeZone)}</time>
            </li>
          ))
        : null}
    </ul>
  );
}
