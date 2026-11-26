"use client";

// Delete trip confirmation (F2.AC9, F2.AC10). A native <dialog> opened with showModal() by the trip
// page. Its copy comes from trip-messages.ts. Cancel and Escape both report "cancel"; only the
// confirm button reports "confirm". While a delete is in flight, Escape is blocked and both buttons
// are disabled.

import type { RefObject, SyntheticEvent } from "react";
import type { DeleteDialogChoice } from "@/domain/trip-view";
import {
  CANCEL_BUTTON,
  DELETE_DIALOG_BODY,
  DELETE_TRIP_BUTTON,
  DELETING_BUTTON,
  deleteDialogTitle,
} from "@/domain/trip-messages";

const TITLE_ID = "delete-trip-title";

type Props = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  tripName: string;
  deleting: boolean;
  errorMessage: string | null;
  onChoose: (choice: DeleteDialogChoice) => void;
  onClosed: () => void;
};

export function DeleteTripDialog({
  dialogRef,
  tripName,
  deleting,
  errorMessage,
  onChoose,
  onClosed,
}: Props) {
  // Escape fires "cancel". It is blocked while a delete is in flight.
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    if (!deleting) {
      onChoose("cancel");
    }
  }

  return (
    <dialog ref={dialogRef} aria-labelledby={TITLE_ID} onCancel={handleCancel} onClose={onClosed}>
      <h2 id={TITLE_ID}>{deleteDialogTitle(tripName)}</h2>
      <p>{DELETE_DIALOG_BODY}</p>
      {errorMessage !== null ? <p role="alert">{errorMessage}</p> : null}
      <button type="button" disabled={deleting} onClick={() => onChoose("cancel")}>
        {CANCEL_BUTTON}
      </button>{" "}
      <button type="button" disabled={deleting} onClick={() => onChoose("confirm")}>
        {deleting ? DELETING_BUTTON : DELETE_TRIP_BUTTON}
      </button>
    </dialog>
  );
}
