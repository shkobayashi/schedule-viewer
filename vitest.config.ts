import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      // 実測より約 1 ポイント下の整数。上げ下げは docs/development.md。
      thresholds: {
        lines: 73,
        functions: 75,
        branches: 61,
        statements: 67,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          include: ["src/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["src/test/setupDomTests.ts"],
        },
      },
    ],
  },
});
