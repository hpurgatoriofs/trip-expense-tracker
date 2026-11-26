// POST /api/auth/login (F1.R6, F1.AC5, F1.AC6, F1.AC9, F1.AC10, F1.AC12). Thin: parses the request,
// calls the login service and maps its result to a status code. The request body is never logged.

import { createArgon2Hasher } from "@/auth/argon2-hasher";
import { createIronSessionStore } from "@/auth/iron-session-store";
import { getDb } from "@/db/client";
import { createUserStore } from "@/db/user-store";
import { safeReturnTarget } from "@/domain/return-target";
import { loadConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import type { PasswordHasher } from "@/ports/password-hasher";
import { login, type LoginDeps } from "@/services/login";

// The hasher computes a dummy hash when it is created, so it is built once and reused.
let hasherPromise: Promise<PasswordHasher> | undefined;
function getHasher(): Promise<PasswordHasher> {
  hasherPromise ??= createArgon2Hasher();
  return hasherPromise;
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

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonObject(request);
  if (body === null) {
    return Response.json({ error: { code: "invalid_body" } }, { status: 400 });
  }

  // A missing email or password is treated as empty, which fails the same way as a wrong
  // password. A present value that is not a string is an invalid body.
  const values = { email: "", password: "" };
  for (const key of ["email", "password"] as const) {
    const value = body[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") {
      return Response.json({ error: { code: "invalid_body" } }, { status: 400 });
    }
    values[key] = value;
  }

  const config = loadConfig();
  const deps: LoginDeps = {
    users: createUserStore(getDb()),
    hasher: await getHasher(),
    session: createIronSessionStore(config),
    logger,
    now: () => new Date(),
  };

  const result = await login(deps, values);
  if (!result.ok) {
    return Response.json({ error: { code: result.error } }, { status: 401 });
  }

  // The client does not choose the redirect: the server checks `next` (F1.AC10).
  return Response.json({ redirectTo: safeReturnTarget(body.next) }, { status: 200 });
}
