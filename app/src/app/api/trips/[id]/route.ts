// GET /api/trips/[id] (F2.AC8, F2.AC11, F2.AC12, F2.AC13) and DELETE /api/trips/[id]
// (F2.AC10, F2.AC11, F2.AC12, F2.AC13). Thin: calls a trip service and maps the result to a status
// code. A trip owned by someone else and a missing trip get the same 404 response. No body is logged.

import { getTripDeps } from "@/lib/deps";
import { deleteTrip } from "@/services/delete-trip";
import { getTrip } from "@/services/get-trip";

type RouteContext = { params: Promise<{ id: string }> };

const ROUTE_GET = "GET /api/trips/[id]";
const ROUTE_DELETE = "DELETE /api/trips/[id]";

function errorResponse(code: string, status: number): Response {
  return Response.json({ error: { code } }, { status });
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const deps = getTripDeps();
  try {
    const { id } = await params;
    const result = await getTrip(deps, { tripId: id });
    if (!result.ok) {
      return errorResponse(result.error, result.error === "not_found" ? 404 : 401);
    }
    return Response.json({ trip: result.trip }, { status: 200 });
  } catch (error) {
    deps.logger.error({ route: ROUTE_GET, errorName: errorName(error) }, "trip request failed");
    return errorResponse("internal", 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext): Promise<Response> {
  const deps = getTripDeps();
  try {
    const { id } = await params;
    const result = await deleteTrip(deps, { tripId: id });
    if (!result.ok) {
      return errorResponse(result.error, result.error === "not_found" ? 404 : 401);
    }
    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    deps.logger.error({ route: ROUTE_DELETE, errorName: errorName(error) }, "trip request failed");
    return errorResponse("internal", 500);
  }
}
