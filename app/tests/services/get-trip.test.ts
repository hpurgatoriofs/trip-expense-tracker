import { describe, expect, it } from "vitest";
import { getTrip, type GetTripDeps } from "../../src/services/get-trip";
import { FakeSessionStore } from "../fakes/fake-session-store";
import { InMemoryTripStore } from "../fakes/in-memory-trip-store";

const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z");
const LOGGED_IN_AT = "2026-01-01T00:00:00.000Z";

async function makeDeps(userId = "user-1") {
  const session = new FakeSessionStore();
  await session.start(userId, LOGGED_IN_AT);
  const trips = new InMemoryTripStore();
  const deps: GetTripDeps = { session, trips, now: () => FIXED_NOW };
  return { deps, session, trips };
}

describe("getTrip", () => {
  it("F2.AC8 another owner's trip and a missing trip give the same not-found result", async () => {
    const { deps, trips } = await makeDeps("user-1");
    trips.records.set("trip-b", {
      id: "trip-b",
      ownerId: "user-2",
      name: "Someone else's trip",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
    });

    const otherOwners = await getTrip(deps, { tripId: "trip-b" });
    const missing = await getTrip(deps, { tripId: "no-such-trip" });

    expect(otherOwners).toEqual({ ok: false, error: "not_found" });
    expect(missing).toEqual({ ok: false, error: "not_found" });
    expect(otherOwners).toEqual(missing);
  });

  it("F2.AC8 the not-found result carries no trip data", async () => {
    const { deps, trips } = await makeDeps("user-1");
    trips.records.set("trip-b", {
      id: "trip-b",
      ownerId: "user-2",
      name: "Secret name",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
    });

    const result = await getTrip(deps, { tripId: "trip-b" });

    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(JSON.stringify(result)).not.toContain("Secret name");
    expect(JSON.stringify(result)).not.toContain("trip-b");
    expect(JSON.stringify(result)).not.toContain("user-2");
  });

  it("F2.AC11 a deleted trip gives the same not-found result as a missing one", async () => {
    const { deps, trips } = await makeDeps("user-1");
    trips.records.set("trip-a", {
      id: "trip-a",
      ownerId: "user-1",
      name: "Lisbon",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
    });
    // The trip is removed, as deleteForOwner would do.
    trips.records.delete("trip-a");

    const deleted = await getTrip(deps, { tripId: "trip-a" });
    const missing = await getTrip(deps, { tripId: "never-existed" });

    expect(deleted).toEqual({ ok: false, error: "not_found" });
    expect(deleted).toEqual(missing);
  });

  it("F2.AC12 refuses a request with no session", async () => {
    const { deps, session, trips } = await makeDeps("user-1");
    trips.records.set("trip-a", {
      id: "trip-a",
      ownerId: "user-1",
      name: "Lisbon",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
    });
    await session.end();

    const result = await getTrip(deps, { tripId: "trip-a" });

    expect(result).toEqual({ ok: false, error: "not_logged_in" });
  });

  it("F2.AC13 user B cannot read user A's trip", async () => {
    const { deps, session, trips } = await makeDeps("user-a");
    trips.records.set("trip-a", {
      id: "trip-a",
      ownerId: "user-a",
      name: "Lisbon",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
    });
    // User B logs in and asks for user A's trip id.
    await session.start("user-b", LOGGED_IN_AT);

    const result = await getTrip(deps, { tripId: "trip-a" });

    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("F2.AC8 the owner gets the trip id, name and UTC created time", async () => {
    const { deps, trips } = await makeDeps("user-1");
    trips.records.set("trip-a", {
      id: "trip-a",
      ownerId: "user-1",
      name: "Lisbon",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
    });

    const result = await getTrip(deps, { tripId: "trip-a" });

    expect(result).toEqual({
      ok: true,
      trip: { id: "trip-a", name: "Lisbon", createdAt: "2026-01-01T10:00:00.000Z" },
    });
  });
});
