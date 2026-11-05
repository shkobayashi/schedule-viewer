import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("check-operation-entries matches labels and MCP names in operation-entries.md", () => {
  const result = spawnSync("npx", ["tsx", "scripts/check-operation-entries.ts"], {
    encoding: "utf8",
    cwd: new URL("..", import.meta.url).pathname,
  });
  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout || "check-operation-entries exited non-zero",
  );
});
