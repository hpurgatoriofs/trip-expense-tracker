import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Passes while the suite is empty (until F1.T3 adds the first tests).
    passWithNoTests: true,
  },
});
