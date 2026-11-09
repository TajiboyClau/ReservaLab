import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/servicios/**/*.ts"],
      exclude: ["src/servicios/**/*.d.ts"],
      thresholds: { lines: 70, functions: 70, branches: 65, statements: 70 },
    },
  },
});
