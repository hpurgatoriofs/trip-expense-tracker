import type { SessionOptions } from "iron-session";
import type { AppConfig } from "../lib/config";
import { SESSION_MAX_AGE_SECONDS } from "../domain/session-age";

// Session data kept in the sealed cookie. Nothing personal: an id and a login time.
export type SessionData = {
  userId?: string;
  loggedInAt?: string;
};

export const SESSION_COOKIE_NAME = "trip_session";

// Pure: builds the iron-session options from config. Needs human approval (authentication).
// No maxAge or expires is set, so the cookie is a browser-session cookie (F1.R8, F1.AC8).
// The ttl limits the sealed data to 14 days after login (F1.AC14).
export function sessionOptions(config: AppConfig): SessionOptions {
  return {
    password: config.sessionSecret,
    cookieName: SESSION_COOKIE_NAME,
    ttl: SESSION_MAX_AGE_SECONDS,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: config.isProduction,
    },
  };
}
