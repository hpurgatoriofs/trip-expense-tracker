import { describe, expect, it } from "vitest";
import { listTrips, type ListTripsDeps } from "../../src/services/list-trips";
import { FakeSessionStore } from "../fakes/fake-session-store";
import { InMemoryTripStore } from "../fakes/in-memory-trip-store";

const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z");
const LOGGED_IN_AT = "2026-01-01T00:00:00.000Z";

async function makeDeps(overrides: Partial<ListTripsDeps> = {}) {
  const session = new FakeSessionStore();
  await session.start("user-1", LOGGED_IN_AT);
  const trips = new InMemoryTripStore();
  const deps: ListTripsDeps = {
    session,
    trips,
    now: () => FIXED_NOW,
    ...overrides,
  };
  return { deps, session, trips };
}

describe("listTrips", () => {
  it("F2.AC6 returns only the session user's trips", async () => {
    const { deps, trips } = await makeDeps();
    trips.records.set("trip-a", {
      id: "trip-a",
      ownerId: "user-1",
      name: "Lisbon",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
    });
    trips.records.set("trip-b", {
      id: "trip-b",
      ownerId: "user-2",
      name: "Someone else's trip",
      createdAt: new Date("2026-01-02T10:00:00.000Z"),
    });

    const result = await listTrips(deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trips.map((t) => t.id)).toEqual(["trip-a"]);
    expect(result.trips[0]).toEqual({
      id: "trip-a",
      name: "Lisbon",
      createdAt: "2026-01-01T10:00:00.000Z",
    });
  });

  it("F2.AC6 returns them newest first", async () => {
    const { deps, trips } = await makeDeps();
    trips.records.set("trip-old", {
      id: "trip-old",
      ownerId: "user-1",
      name: "Old",
      createdAt: new Date("2026-01-01T09:00:00.000Z"),
    });
    trips.records.set("trip-new", {
      id: "trip-new",
      ownerId: "user-1",
      name: "New",
      createdAt: new Date("2026-03-01T09:00:00.000Z"),
    });
    trips.records.set("trip-mid", {
      id: "trip-mid",
      ownerId: "user-1",
      name: "Mid",
      createdAt: new Date("2026-02-01T09:00:00.000Z"),
    });

    const result = await listTrips(deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trips.map((t) => t.id)).toEqual(["trip-new", "trip-mid", "trip-old"]);
  });

  it("F2.AC7 a user with no trips gets an empty list", async () => {
    const { deps } = await makeDeps();

    const result = await listTrips(deps);

    expect(result).toEqual({ ok: true, trips: [] });
  });

  it("F2.AC12 refuses a request with no session and makes no store call", async () => {
    const { deps, session, trips } = await makeDeps();
    await session.end();

    const result = await listTrips(deps);

    expect(result).toEqual({ ok: false, error: "not_logged_in" });
    expect(trips.listCalls).toBe(0);
  });
});
