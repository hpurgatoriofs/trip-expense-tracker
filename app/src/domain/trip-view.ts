// Pure view-model rules for the trips list and trip page (F2.AC6 to F2.AC10, F2.AC15, F2.AC16, F2.R7).
// No imports from db/, next/, iron-session or @node-rs/argon2.

export type TripSummary = {
  id: string;
  name: string;
  /** ISO 8601 instant in UTC, e.g. "2026-11-18T09:30:00.000Z". */
  createdAt: string;
};

export type ListRequest<T extends TripSummary = TripSummary> =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "loaded"; trips: T[] };

export type ListState = "loading" | "failed" | "empty" | "loaded";

export type TripRequest<T> = "loading" | "not_found" | "failed" | { status: "loaded"; trip: T };

export type TripPageState = "loading" | "not_found" | "failed" | "loaded";

export type DeleteDialogChoice = "confirm" | "cancel";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Returns a new array, newest first by createdAt, then by id (ascending) so the order is stable
 * when two trips share a created instant. The input array is not changed.
 */
export function sortNewestFirst<T extends TripSummary>(trips: readonly T[]): T[] {
  return [...trips].sort((a, b) => {
    const diff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (diff !== 0) {
      return diff;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Which trips-list state to show. An empty loaded list is the empty state. */
export function listState(request: ListRequest): ListState {
  if (request.status === "loading") {
    return "loading";
  }
  if (request.status === "failed") {
    return "failed";
  }
  return request.trips.length === 0 ? "empty" : "loaded";
}

/** Which trip-page state to show. Not-found is its own state, never a failure. */
export function tripPageState<T>(request: TripRequest<T>): TripPageState {
  if (request === "loading") {
    return "loading";
  }
  if (request === "not_found") {
    return "not_found";
  }
  if (request === "failed") {
    return "failed";
  }
  return "loaded";
}

/**
 * Formats an ISO instant as "18 Nov 2026" in the given IANA time zone (F2.R7).
 * The month name comes from a fixed English table, so the result does not depend on the user's locale.
 * The time zone is an argument; this function never reads the environment or the clock.
 */
export function formatTripDate(iso: string, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = formatter.formatToParts(new Date(iso));
  const read = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((p) => p.type === type);
    if (!part) {
      throw new Error(`formatTripDate: missing ${type} for ${iso}`);
    }
    return part.value;
  };
  const day = Number(read("day"));
  const month = Number(read("month"));
  const year = read("year");
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Only "confirm" calls delete. Cancel, and Escape (same as Cancel), do not. */
export function deleteDialogChoice(choice: DeleteDialogChoice): { callDelete: boolean } {
  return { callDelete: choice === "confirm" };
}
