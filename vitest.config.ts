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
        lines: 68,
        functions: 67,
        branches: 58,
        statements: 64,
        "src/model/**": {
          lines: 78,
          functions: 82,
          branches: 63,
          statements: 70,
        },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["src/**/*.test.ts"],
          exclude: [
            "src/hooks/mcpActionExecutor.file.test.ts",
            "src/hooks/useMcpActionExecutor.setView.test.ts",
          ],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          include: [
            "src/**/*.test.tsx",
            "src/hooks/mcpActionExecutor.file.test.ts",
            "src/hooks/useMcpActionExecutor.setView.test.ts",
          ],
          environment: "jsdom",
          setupFiles: ["src/test/setupDomTests.ts"],
        },
      },
    ],
  },
});
