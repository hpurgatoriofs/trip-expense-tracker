// GET /api/trips (F2.AC6, F2.AC7, F2.AC12) and POST /api/trips (F2.AC1 to F2.AC5, F2.AC12).
// Thin: parses the request, calls a trip service and maps the result to a status code.
// The request body and the trip name are never logged.

import { getTripDeps } from "@/lib/deps";
import { createTrip } from "@/services/create-trip";
import { listTrips } from "@/services/list-trips";

const ROUTE_LIST = "GET /api/trips";
const ROUTE_CREATE = "POST /api/trips";

function errorResponse(code: string, status: number, field?: "name"): Response {
  return Response.json({ error: field ? { code, field } : { code } }, { status });
}

// Returns the JSON object body, or null when the body is not a JSON object.
async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, unknown>;
}

export async function GET(): Promise<Response> {
  const deps = getTripDeps();
  try {
    const result = await listTrips(deps);
    if (!result.ok) {
      return errorResponse(result.error, 401);
    }
    return Response.json({ trips: result.trips }, { status: 200 });
  } catch (error) {
    // The error name only: no body, no trip data.
    deps.logger.error({ route: ROUTE_LIST, errorName: errorName(error) }, "trip request failed");
    return errorResponse("internal", 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonObject(request);
  if (body === null) {
    return errorResponse("invalid_body", 400);
  }

  const deps = getTripDeps();
  try {
    const result = await createTrip(deps, { name: body.name });
    if (!result.ok) {
      if (result.error === "not_logged_in") {
        return errorResponse(result.error, 401);
      }
      return errorResponse(result.error, 400, "name");
    }
    const { id, name, createdAt } = result.trip;
    return Response.json(
      { trip: { id, name, createdAt: createdAt.toISOString() } },
      { status: 201 },
    );
  } catch (error) {
    deps.logger.error({ route: ROUTE_CREATE, errorName: errorName(error) }, "trip request failed");
    return errorResponse("internal", 500);
  }
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}
