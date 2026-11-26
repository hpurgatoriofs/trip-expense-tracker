// Pure trip name validation (F2.AC2, F2.AC3, F2.AC4). No imports from db/, next/, iron-session or @node-rs/argon2.

export const TRIP_NAME_MAX_LENGTH = 100;

export type TripNameErrorCode = "blank_name" | "name_too_long";

export type TripNameResult =
  | { ok: true; name: string }
  | { ok: false; code: TripNameErrorCode };

/**
 * Validates a trip name. The name is trimmed first, then checked.
 * A non-string or a name that is empty after trimming gives `blank_name`.
 * Length counts code points, so an emoji counts as one character.
 * Inner spaces are kept as typed.
 */
export function validateTripName(raw: unknown): TripNameResult {
  if (typeof raw !== "string") {
    return { ok: false, code: "blank_name" };
  }
  const name = raw.trim();
  if (name === "") {
    return { ok: false, code: "blank_name" };
  }
  if ([...name].length > TRIP_NAME_MAX_LENGTH) {
    return { ok: false, code: "name_too_long" };
  }
  return { ok: true, name };
}
