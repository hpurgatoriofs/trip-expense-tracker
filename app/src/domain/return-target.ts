const DEFAULT_TARGET = "/trips";
const MAX_LENGTH = 2048;

function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/**
 * Returns the raw return target when it is a safe in-app path (F1.AC9, F1.AC10).
 * Anything else falls back to `/trips`.
 */
export function safeReturnTarget(raw: unknown): string {
  if (typeof raw !== "string") {
    return DEFAULT_TARGET;
  }
  if (raw.length > MAX_LENGTH) {
    return DEFAULT_TARGET;
  }
  if (!raw.startsWith("/")) {
    return DEFAULT_TARGET;
  }
  // A second "/" makes a protocol-relative address; "/\" is treated as one by browsers.
  if (raw.length > 1 && (raw[1] === "/" || raw[1] === "\\")) {
    return DEFAULT_TARGET;
  }
  if (raw.includes("\\")) {
    return DEFAULT_TARGET;
  }
  if (hasControlCharacter(raw)) {
    return DEFAULT_TARGET;
  }
  if (raw.includes("://")) {
    return DEFAULT_TARGET;
  }
  return raw;
}
