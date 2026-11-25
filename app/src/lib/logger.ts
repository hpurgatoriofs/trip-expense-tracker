import pino, { type DestinationStream, type LoggerOptions } from "pino";

// Fields that must never appear in log output. Pino replaces their values
// with "[Redacted]" before writing the record.
export const REDACT_PATHS = [
  "password",
  "password_hash",
  "confirm",
  "*.password",
  "*.password_hash",
  "*.confirm",
  "token",
  "secret",
  "cookie",
  "authorization",
];

export type LoggerFactoryOptions = {
  // Where log lines are written. Defaults to stdout. Tests pass a stream
  // they can read from.
  destination?: DestinationStream;
  level?: string;
};

export function createLogger(options: LoggerFactoryOptions = {}) {
  const pinoOptions: LoggerOptions = {
    level: options.level ?? "info",
    redact: { paths: REDACT_PATHS, censor: "[Redacted]" },
  };
  return options.destination
    ? pino(pinoOptions, options.destination)
    : pino(pinoOptions);
}

// The project logger. Other modules import this instance rather than
// creating their own.
export const logger = createLogger();
