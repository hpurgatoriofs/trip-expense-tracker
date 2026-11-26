import { describe, expect, it } from "vitest";
import {
  BACK_TO_TRIPS_BUTTON,
  CANCEL_BUTTON,
  CREATE_TRIP_BUTTON,
  DELETE_DIALOG_BODY,
  DELETE_FAILED_MESSAGE,
  DELETE_TRIP_BUTTON,
  DELETING_BUTTON,
  SAVING_BUTTON,
  TRIP_FAILED_MESSAGE,
  TRIP_LOADING_MESSAGE,
  TRIP_NAME_BLANK_MESSAGE,
  TRIP_NAME_TOO_LONG_MESSAGE,
  TRIP_NOT_FOUND_BODY,
  TRIP_NOT_FOUND_HEADING,
  TRIP_SAVE_FAILED_MESSAGE,
  TRIPS_EMPTY_MESSAGE,
  TRIPS_FAILED_MESSAGE,
  TRIPS_LOADING_MESSAGE,
  TRY_AGAIN_BUTTON,
  deleteDialogTitle,
} from "../../src/domain/trip-messages";

describe("trip messages", () => {
  it("F2.AC2 blank-name copy matches the approved text", () => {
    expect(TRIP_NAME_BLANK_MESSAGE).toBe("Enter a trip name.");
  });

  it("F2.AC3 length copy matches the approved text", () => {
    expect(TRIP_NAME_TOO_LONG_MESSAGE).toBe("Trip names can be up to 100 characters.");
  });

  it("F2.AC8 not-found copy matches the approved text", () => {
    expect(TRIP_NOT_FOUND_HEADING).toBe("Trip not found.");
    expect(TRIP_NOT_FOUND_BODY).toBe("We couldn't find that trip.");
    expect(BACK_TO_TRIPS_BUTTON).toBe("Back to trips");
  });

  it("F2.AC10 delete dialog copy matches the approved text", () => {
    expect(deleteDialogTitle("Lisbon")).toBe("Delete Lisbon?");
    expect(DELETE_DIALOG_BODY).toBe(
      "This removes the trip and all its people, expenses and payments. This can't be undone.",
    );
    expect(DELETE_TRIP_BUTTON).toBe("Delete trip");
    expect(CANCEL_BUTTON).toBe("Cancel");
    expect(DELETING_BUTTON).toBe("Deleting…");
    expect(DELETE_FAILED_MESSAGE).toBe("We couldn't delete this trip. Try again.");
  });

  it("F2.AC15 list loading and failure copy match the approved text", () => {
    expect(TRIPS_LOADING_MESSAGE).toBe("Loading your trips…");
    expect(TRIPS_FAILED_MESSAGE).toBe("We couldn't load your trips. Try again.");
    expect(TRY_AGAIN_BUTTON).toBe("Try again");
  });

  it("F2.AC16 trip loading and failure copy match the approved text", () => {
    expect(TRIP_LOADING_MESSAGE).toBe("Loading trip…");
    expect(TRIP_FAILED_MESSAGE).toBe("We couldn't load this trip. Try again.");
  });

  it("F2.AC7 empty-list copy matches the approved text", () => {
    expect(TRIPS_EMPTY_MESSAGE).toBe("You have no trips yet.");
    expect(CREATE_TRIP_BUTTON).toBe("Create trip");
  });

  it("F2.AC1 create-failure and saving copy match the approved text", () => {
    expect(TRIP_SAVE_FAILED_MESSAGE).toBe("We couldn't save your trip. Try again.");
    expect(SAVING_BUTTON).toBe("Saving…");
  });
});
