import { describe, expect, it } from "vitest";
import { createTrip, type CreateTripDeps } from "../../src/services/create-trip";
import { FakeLogger } from "../fakes/fake-logger";
import { FakeSessionStore } from "../fakes/fake-session-store";
import { InMemoryTripStore } from "../fakes/in-memory-trip-store";

const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z");
const LOGGED_IN_AT = "2026-01-01T00:00:00.000Z";

async function makeDeps(overrides: Partial<CreateTripDeps> = {}) {
  const session = new FakeSessionStore();
  await session.start("user-1", LOGGED_IN_AT);
  const trips = new InMemoryTripStore();
  const logger = new FakeLogger();
  let counter = 0;
  const deps: CreateTripDeps = {
    session,
    trips,
    logger,
    now: () => FIXED_NOW,
    newId: () => `trip-${++counter}`,
    ...overrides,
  };
  return { deps, session, trips, logger };
}

describe("createTrip", () => {
  it("F2.AC1 creates a trip owned by the session user", async () => {
    const { deps, trips } = await makeDeps();

    const result = await createTrip(deps, { name: "Lisbon" });

    expect(result).toEqual({
      ok: true,
      trip: {
        id: "trip-1",
        ownerId: "user-1",
        name: "Lisbon",
        createdAt: FIXED_NOW,
      },
    });
    expect(trips.writeCount).toBe(1);
    expect(trips.records.get("trip-1")).toEqual({
      id: "trip-1",
      ownerId: "user-1",
      name: "Lisbon",
      createdAt: FIXED_NOW,
    });
  });

  it("F2.AC1 ignores an owner id sent in the request", async () => {
    const { deps, trips } = await makeDeps();
    const request = { name: "Lisbon", ownerId: "someone-else" };

    const result = await createTrip(deps, request);

    expect(result.ok).toBe(true);
    expect(trips.records.get("trip-1")!.ownerId).toBe("user-1");
    expect(trips.writeCount).toBe(1);
  });

  it("F2.AC2 writes nothing for a blank name", async () => {
    const { deps, trips } = await makeDeps();

    const result = await createTrip(deps, { name: "   " });

    expect(result).toEqual({ ok: false, error: "blank_name" });
    expect(trips.writeCount).toBe(0);
    expect(trips.records.size).toBe(0);
  });

  it("F2.AC3 writes nothing for a name over 100 characters", async () => {
    const { deps, trips } = await makeDeps();

    const result = await createTrip(deps, { name: "a".repeat(101) });

    expect(result).toEqual({ ok: false, error: "name_too_long" });
    expect(trips.writeCount).toBe(0);
    expect(trips.records.size).toBe(0);
  });

  it("F2.AC4 saves the trimmed name", async () => {
    const { deps, trips } = await makeDeps();

    const result = await createTrip(deps, { name: "  Lisbon trip  " });

    expect(result.ok).toBe(true);
    expect(trips.records.get("trip-1")!.name).toBe("Lisbon trip");
  });

  it("F2.AC5 saves two trips with the same name for one user", async () => {
    const { deps, trips } = await makeDeps();

    const first = await createTrip(deps, { name: "Lisbon" });
    const second = await createTrip(deps, { name: "Lisbon" });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(trips.records.size).toBe(2);
    expect(trips.records.get("trip-1")!.name).toBe("Lisbon");
    expect(trips.records.get("trip-2")!.name).toBe("Lisbon");
    expect(trips.records.get("trip-1")!.ownerId).toBe("user-1");
    expect(trips.records.get("trip-2")!.ownerId).toBe("user-1");
  });

  it("F2.AC12 refuses a request with no session and writes nothing", async () => {
    const { deps, session, trips } = await makeDeps();
    await session.end();

    const result = await createTrip(deps, { name: "Lisbon" });

    expect(result).toEqual({ ok: false, error: "not_logged_in" });
    expect(trips.writeCount).toBe(0);
    expect(trips.records.size).toBe(0);
  });

  it("logs the trip and owner ids with the message 'trip created', never the name", async () => {
    const { deps, logger } = await makeDeps();

    await createTrip(deps, { name: "Secret Lisbon Plan" });

    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0]!.message).toBe("trip created");
    expect(logger.allText()).toContain("trip-1");
    expect(logger.allText()).toContain("user-1");
    expect(logger.allText()).not.toContain("Secret Lisbon Plan");
  });
});
