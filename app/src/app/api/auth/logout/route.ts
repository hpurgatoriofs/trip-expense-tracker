// POST /api/auth/logout (F1.AC7). Thin: ends the session and returns 200. Also 200 when there is
// no session, so a repeated logout is not an error.

import { createIronSessionStore } from "@/auth/iron-session-store";
import { loadConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { logout, type LogoutDeps } from "@/services/logout";

export async function POST(): Promise<Response> {
  const deps: LogoutDeps = {
    session: createIronSessionStore(loadConfig()),
    logger,
  };

  await logout(deps);
  return Response.json({ ok: true }, { status: 200 });
}
