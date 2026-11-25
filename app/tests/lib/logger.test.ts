import { describe, expect, it } from "vitest";
import { createLogger } from "../../src/lib/logger";

function captureLogger() {
  const chunks: string[] = [];
  const logger = createLogger({
    destination: { write: (msg: string) => void chunks.push(msg) },
  });
  return { logger, output: () => chunks.join("") };
}

describe("logger redaction", () => {
  it("F1.AC12 redacts password and password_hash fields in log output", () => {
    const { logger, output } = captureLogger();
    const plain = "correct-horse-battery-staple";
    const hash = "$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA";

    logger.info({ password: plain, password_hash: hash }, "register");
    logger.info({ user: { password: plain, password_hash: hash } }, "nested");

    const out = output();
    expect(out).not.toContain(plain);
    expect(out).not.toContain(hash);
    expect(out).toContain("[Redacted]");
  });

  it("F1.AC12 keeps non-secret fields in log output", () => {
    const { logger, output } = captureLogger();

    logger.info({ email: "a@example.com", password: "x".repeat(20) }, "login");

    expect(output()).toContain("a@example.com");
    expect(output()).toContain("login");
  });
});
