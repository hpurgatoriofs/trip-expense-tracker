import { describe, expect, it } from "vitest";
import { deleteTrip, type DeleteTripDeps } from "../../src/services/delete-trip";
import { getTrip } from "../../src/services/get-trip";
import { FakeLogger } from "../fakes/fake-logger";
import { FakeSessionStore } from "../fakes/fake-session-store";
import { InMemoryTripStore } from "../fakes/in-memory-trip-store";

const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z");
const LOGGED_IN_AT = "2026-01-01T00:00:00.000Z";

async function makeDeps(userId = "user-1") {
  const session = new FakeSessionStore();
  await session.start(userId, LOGGED_IN_AT);
  const trips = new InMemoryTripStore();
  const logger = new FakeLogger();
  const deps: DeleteTripDeps = { session, trips, now: () => FIXED_NOW, logger };
  return { deps, session, trips, logger };
}

function seedTrip(trips: InMemoryTripStore, id: string, ownerId: string) {
  trips.records.set(id, {
    id,
    ownerId,
    name: "Lisbon",
    createdAt: new Date("2026-01-01T10:00:00.000Z"),
  });
}

describe("deleteTrip", () => {
  it("F2.AC10 calls the store's delete exactly once and returns ok", async () => {
    const { deps, trips } = await makeDeps("user-1");
    seedTrip(trips, "trip-a", "user-1");

    const result = await deleteTrip(deps, { tripId: "trip-a" });

    expect(result).toEqual({ ok: true });
    expect(trips.deleteCalls).toBe(1);
    expect(trips.records.has("trip-a")).toBe(false);
  });

  it("F2.AC10 deleting a missing trip returns not-found", async () => {
    const { deps, trips } = await makeDeps("user-1");

    const result = await deleteTrip(deps, { tripId: "no-such-trip" });

    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(trips.deleteCalls).toBe(1);
  });

  it("F2.AC11 a deleted trip cannot be fetched afterwards", async () => {
    const { deps, trips } = await makeDeps("user-1");
    seedTrip(trips, "trip-a", "user-1");

    const first = await deleteTrip(deps, { tripId: "trip-a" });
    const second = await deleteTrip(deps, { tripId: "trip-a" });
    const fetched = await getTrip(
      { session: deps.session, trips: deps.trips, now: deps.now },
      { tripId: "trip-a" },
    );

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: false, error: "not_found" });
    expect(fetched).toEqual({ ok: false, error: "not_found" });
  });

  it("F2.AC12 refuses a request with no session and deletes nothing", async () => {
    const { deps, session, trips, logger } = await makeDeps("user-1");
    seedTrip(trips, "trip-a", "user-1");
    await session.end();

    const result = await deleteTrip(deps, { tripId: "trip-a" });

    expect(result).toEqual({ ok: false, error: "not_logged_in" });
    expect(trips.deleteCalls).toBe(0);
    expect(trips.records.has("trip-a")).toBe(true);
    expect(logger.entries).toHaveLength(0);
  });

  it("F2.AC13 user B cannot delete user A's trip and nothing is removed", async () => {
    const { deps, session, trips } = await makeDeps("user-a");
    seedTrip(trips, "trip-a", "user-a");
    await session.start("user-b", LOGGED_IN_AT);

    const result = await deleteTrip(deps, { tripId: "trip-a" });

    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(trips.records.has("trip-a")).toBe(true);
    expect(trips.writeCount).toBe(0);
  });

  it("F2.AC10 logs the trip and owner ids, never the trip name", async () => {
    const { deps, trips, logger } = await makeDeps("user-1");
    seedTrip(trips, "trip-a", "user-1");

    await deleteTrip(deps, { tripId: "trip-a" });

    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0]?.message).toBe("trip deleted");
    expect(logger.allText()).toContain("trip-a");
    expect(logger.allText()).toContain("user-1");
    expect(logger.allText()).not.toContain("Lisbon");
  });
});
