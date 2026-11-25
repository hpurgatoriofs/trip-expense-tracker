// Access gate glue (F1.AC7, F1.AC14). Next.js 16 names this file proxy.ts and exports `proxy`
// (the scaffold uses Next.js 16.4.6, see the F1 plan's Decisions log). It only calls gate.ts,
// domain/session-age.ts and the session options; the rules themselves are tested there.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession, nextProxyCookies } from "iron-session";
import { sessionOptions, type SessionData } from "./auth/session-options";
import { isProtectedPath, loginRedirect } from "./auth/gate";
import { isSessionExpired } from "./domain/session-age";
import { loadConfig } from "./lib/config";

export async function proxy(request: NextRequest) {
  // Config is read per request, not at import time, so `next build` does not need the secret.
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    nextProxyCookies(request, response),
    sessionOptions(loadConfig()),
  );

  // A missing loggedInAt counts as logged out. An expired login (14 days) counts as logged out
  // even when the cookie seal has not expired yet (F1.AC14).
  const loggedOut =
    !session.userId ||
    !session.loggedInAt ||
    isSessionExpired(session.loggedInAt, new Date());

  const { pathname, search } = request.nextUrl;
  if (isProtectedPath(pathname) && loggedOut) {
    return NextResponse.redirect(new URL(loginRedirect(pathname, search), request.url));
  }

  return response;
}

// Negative match: skips Next.js static files and image optimiser output, and favicon.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
