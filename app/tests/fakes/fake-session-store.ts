// In-memory fake for the SessionStore port (F1). Holds at most one logged-in session.

import type { CurrentSession, SessionStore } from "../../src/ports/session-store";

export class FakeSessionStore implements SessionStore {
  /** The single session, or null when logged out. */
  session: CurrentSession | null = null;

  async start(userId: string, loggedInAt: string): Promise<void> {
    this.session = { userId, loggedInAt };
  }

  async end(): Promise<void> {
    this.session = null;
  }

  async current(): Promise<CurrentSession | null> {
    return this.session;
  }
}
