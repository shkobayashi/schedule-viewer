import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("check-madge-circular-baseline matches madge-circular-baseline.json", () => {
  const result = spawnSync("npx", ["tsx", "scripts/check-madge-circular-baseline.ts"], {
    encoding: "utf8",
    cwd: new URL("..", import.meta.url).pathname,
  });
  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout || "check-madge-circular-baseline exited non-zero",
  );
});
