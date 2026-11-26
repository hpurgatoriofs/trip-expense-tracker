export type AppConfig = {
  sessionSecret: string;
  databaseUrl: string;
  isProduction: boolean;
};

export const MIN_SESSION_SECRET_LENGTH = 32;

// Pure: takes the environment as an argument so tests can pass a plain object.
export function parseConfig(env: Record<string, string | undefined>): AppConfig {
  const sessionSecret = env.SESSION_SECRET ?? "";
  if (sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters. Set it in .env.`,
    );
  }

  const databaseUrl = env.DATABASE_URL ?? "";
  if (databaseUrl.trim() === "") {
    throw new Error("DATABASE_URL must be set. Set it in .env.");
  }

  return {
    sessionSecret,
    databaseUrl,
    isProduction: env.NODE_ENV === "production",
  };
}

// The only place that reads process.env.
export function loadConfig(): AppConfig {
  return parseConfig(process.env);
}
