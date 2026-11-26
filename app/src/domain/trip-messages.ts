/**
 * Approved copy for trips (spec F2, States & errors, approved 2026-11-19).
 * Wording is final: copy it word for word. Pure: no imports from db/, next/, iron-session or @node-rs/argon2.
 */

// Create trip
export const TRIP_NAME_BLANK_MESSAGE = "Enter a trip name.";
export const TRIP_NAME_TOO_LONG_MESSAGE = "Trip names can be up to 100 characters.";
export const TRIP_SAVE_FAILED_MESSAGE = "We couldn't save your trip. Try again.";
export const CREATE_TRIP_BUTTON = "Create trip";
export const SAVING_BUTTON = "Saving…";

// Trips list
export const TRIPS_LOADING_MESSAGE = "Loading your trips…";
export const TRIPS_EMPTY_MESSAGE = "You have no trips yet.";
export const TRIPS_FAILED_MESSAGE = "We couldn't load your trips. Try again.";
export const TRY_AGAIN_BUTTON = "Try again";

// Trip page
export const TRIP_NOT_FOUND_HEADING = "Trip not found.";
export const TRIP_NOT_FOUND_BODY = "We couldn't find that trip.";
export const BACK_TO_TRIPS_BUTTON = "Back to trips";
export const TRIP_LOADING_MESSAGE = "Loading trip…";
export const TRIP_FAILED_MESSAGE = "We couldn't load this trip. Try again.";

// Delete dialog
export const DELETE_DIALOG_BODY =
  "This removes the trip and all its people, expenses and payments. This can't be undone.";
export const DELETE_TRIP_BUTTON = "Delete trip";
export const DELETING_BUTTON = "Deleting…";
export const CANCEL_BUTTON = "Cancel";
export const DELETE_FAILED_MESSAGE = "We couldn't delete this trip. Try again.";

/** Dialog title, "Delete [trip name]?", with the trip's name filled in. */
export function deleteDialogTitle(tripName: string): string {
  return `Delete ${tripName}?`;
}
