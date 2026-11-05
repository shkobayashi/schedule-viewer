import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("check-regression-coverage maps headings, operations, tools, and manual cases", () => {
  const result = spawnSync("npx", ["tsx", "scripts/check-regression-coverage.ts"], {
    encoding: "utf8",
    cwd: new URL("..", import.meta.url).pathname,
  });
  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout || "check-regression-coverage exited non-zero",
  );
});
