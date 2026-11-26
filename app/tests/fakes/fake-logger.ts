// Fake for the Logger port. Records every call so tests can search the logged text,
// for example to prove a password never appears in a log line.

import type { Logger } from "../../src/ports/logger";

export type LogLevel = "info" | "warn" | "error";

export type LogEntry = {
  level: LogLevel;
  /** The fields object, serialised to a string. */
  fields: string;
  message: string;
};

function serialise(fields: object): string {
  try {
    return JSON.stringify(fields);
  } catch {
    return String(fields);
  }
}

export class FakeLogger implements Logger {
  readonly entries: LogEntry[] = [];

  info(fields: object, message: string): void {
    this.record("info", fields, message);
  }

  warn(fields: object, message: string): void {
    this.record("warn", fields, message);
  }

  error(fields: object, message: string): void {
    this.record("error", fields, message);
  }

  /** All recorded fields and messages joined into one string, for substring searches. */
  allText(): string {
    return this.entries.map((e) => `${e.fields} ${e.message}`).join("\n");
  }

  private record(level: LogLevel, fields: object, message: string): void {
    this.entries.push({ level, fields: serialise(fields), message: String(message) });
  }
}
