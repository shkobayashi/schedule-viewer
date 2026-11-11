import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("check-consult-lazy-loading structural guard", () => {
  const result = spawnSync(
    "node",
    ["scripts/check-consult-lazy-loading.mjs"],
    {
      encoding: "utf8",
      cwd: new URL("..", import.meta.url).pathname,
    },
  );
  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout || "check-consult-lazy-loading failed",
  );
  const metrics = JSON.parse(result.stdout.trim().split("\n").pop());
  assert.equal(metrics.beforeMonolithConsultMdcBytes, 8107);
  assert.ok(metrics.afterStubConsultMdcBytes < metrics.beforeMonolithConsultMdcBytes);
  assert.ok(metrics.sessionBodyBytes > 0);
});
