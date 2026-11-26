import { describe, expect, it } from "vitest";
import {
  deleteDialogChoice,
  formatTripDate,
  listState,
  sortNewestFirst,
  tripPageState,
  type TripSummary,
} from "../../src/domain/trip-view";

const trip = (id: string, createdAt: string, name = `Trip ${id}`): TripSummary => ({
  id,
  name,
  createdAt,
});

describe("sortNewestFirst", () => {
  it("F2.AC6 sorts trips newest first", () => {
    const trips = [
      trip("a", "2026-11-01T10:00:00.000Z"),
      trip("b", "2026-11-18T10:00:00.000Z"),
      trip("c", "2026-10-05T10:00:00.000Z"),
    ];
    expect(sortNewestFirst(trips).map((t) => t.id)).toEqual(["b", "a", "c"]);
  });

  it("F2.AC6 breaks ties on id so the order is stable", () => {
    const same = "2026-11-18T10:00:00.000Z";
    const trips = [trip("m", same), trip("a", same), trip("z", same)];
    expect(sortNewestFirst(trips).map((t) => t.id)).toEqual(["a", "m", "z"]);
  });

  it("F2.AC6 does not change the array it is given", () => {
    const trips = [trip("a", "2026-11-01T10:00:00.000Z"), trip("b", "2026-11-18T10:00:00.000Z")];
    sortNewestFirst(trips);
    expect(trips.map((t) => t.id)).toEqual(["a", "b"]);
  });
});

describe("listState", () => {
  it("F2.AC7 an empty list gives the empty state", () => {
    expect(listState({ status: "loaded", trips: [] })).toBe("empty");
  });

  it("F2.AC6 a non-empty list gives the loaded state", () => {
    expect(listState({ status: "loaded", trips: [trip("a", "2026-11-18T10:00:00.000Z")] })).toBe(
      "loaded",
    );
  });

  it("F2.AC15 a list request in flight gives the loading state", () => {
    expect(listState({ status: "loading" })).toBe("loading");
  });

  it("F2.AC15 a failed list request gives the failed state", () => {
    expect(listState({ status: "failed" })).toBe("failed");
  });
});

describe("tripPageState", () => {
  it("F2.AC8 a not-found trip request gives the not-found state", () => {
    expect(tripPageState("not_found")).toBe("not_found");
  });

  it("F2.AC16 a trip request in flight gives the loading state", () => {
    expect(tripPageState("loading")).toBe("loading");
  });

  it("F2.AC16 a trip request that fails, other than not-found, gives the failed state", () => {
    expect(tripPageState("failed")).toBe("failed");
  });

  it("F2.AC16 not-found is not shown as a failure", () => {
    expect(tripPageState("not_found")).not.toBe("failed");
  });

  it("F2.AC16 a loaded trip request gives the loaded state", () => {
    expect(tripPageState({ status: "loaded", trip: { id: "a" } })).toBe("loaded");
  });
});

describe("formatTripDate", () => {
  it("F2.R7 formats 2026-11-18 in the user's time zone as 18 Nov 2026", () => {
    // 12:00 UTC is still 18 Nov in New York (07:00) and in UTC.
    expect(formatTripDate("2026-11-18T12:00:00.000Z", "America/New_York")).toBe("18 Nov 2026");
    expect(formatTripDate("2026-11-18T12:00:00.000Z", "UTC")).toBe("18 Nov 2026");
  });

  it("F2.R7 uses the same format for a different time zone", () => {
    // 23:30 UTC on 18 Nov is already 19 Nov in Auckland, so the zone changes the day shown.
    expect(formatTripDate("2026-11-18T23:30:00.000Z", "Pacific/Auckland")).toBe("19 Nov 2026");
    expect(formatTripDate("2026-11-18T23:30:00.000Z", "UTC")).toBe("18 Nov 2026");
  });

  it("F2.R7 shows a single-digit day without a leading zero", () => {
    expect(formatTripDate("2026-11-05T12:00:00.000Z", "UTC")).toBe("5 Nov 2026");
  });
});

describe("deleteDialogChoice", () => {
  it("F2.AC9 cancel does not call delete", () => {
    expect(deleteDialogChoice("cancel")).toEqual({ callDelete: false });
  });

  it("F2.AC10 confirm calls delete", () => {
    expect(deleteDialogChoice("confirm")).toEqual({ callDelete: true });
  });
});
