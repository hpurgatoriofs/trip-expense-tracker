// Port for logging (project rules: use the project logger only). Interface only. Implemented in src/lib/logger.ts.

export interface Logger {
  info(fields: object, message: string): void;
  warn(fields: object, message: string): void;
  error(fields: object, message: string): void;
}
