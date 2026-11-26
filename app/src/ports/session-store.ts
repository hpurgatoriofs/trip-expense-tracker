// Port for the logged-in session (F1). Interface only. Implemented with iron-session in src/auth/.

export type CurrentSession = {
  userId: string;
  /** ISO 8601 UTC timestamp. */
  loggedInAt: string;
};

export interface SessionStore {
  start(userId: string, loggedInAt: string): Promise<void>;
  end(): Promise<void>;
  current(): Promise<CurrentSession | null>;
}
