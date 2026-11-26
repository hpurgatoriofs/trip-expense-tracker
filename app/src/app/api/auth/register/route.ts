// POST /api/auth/register (F1.R3, F1.AC1 to F1.AC4, F1.AC12). Thin: parses the request, calls the
// register service and maps its result to a status code. The request body is never logged.

import { randomUUID } from "node:crypto";
import { createArgon2Hasher } from "@/auth/argon2-hasher";
import { getDb } from "@/db/client";
import { createUserStore } from "@/db/user-store";
import { logger } from "@/lib/logger";
import type { PasswordHasher } from "@/ports/password-hasher";
import { register, type RegisterDeps } from "@/services/register";

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

  // A missing field is treated as empty, so validation reports it as `required`.
  // A field that is present but not a string is an invalid body.
  const values = { email: "", password: "", confirm: "" };
  for (const key of ["email", "password", "confirm"] as const) {
    const value = body[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") {
      return Response.json({ error: { code: "invalid_body" } }, { status: 400 });
    }
    values[key] = value;
  }

  const deps: RegisterDeps = {
    users: createUserStore(getDb()),
    hasher: await getHasher(),
    logger,
    now: () => new Date(),
    newId: () => randomUUID(),
  };

  const result = await register(deps, values);

  if (result.ok) {
    return Response.json({ ok: true }, { status: 201 });
  }
  if ("reason" in result) {
    return Response.json({ error: { code: "email_taken", field: "email" } }, { status: 409 });
  }
  // The first failing field is reported, in the order validation checks them.
  const first = result.errors[0];
  return Response.json({ error: { code: first.code, field: first.field } }, { status: 400 });
}
