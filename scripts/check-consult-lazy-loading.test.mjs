import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  REQUIRED_SESSION_HEADINGS,
  findForbiddenHeadingsInStub,
} from "./check-consult-lazy-loading.mjs";

test("stub must reject every relocated session body heading", () => {
  const minimalStub = "---\ndescription: x\nalwaysApply: true\n---\n";
  assert.deepEqual(findForbiddenHeadingsInStub(minimalStub), []);
  assert.deepEqual(findForbiddenHeadingsInStub(`${minimalStub}## 説明の仕方\n`), [
    "## 説明の仕方",
  ]);
  for (const heading of REQUIRED_SESSION_HEADINGS) {
    assert.ok(
      findForbiddenHeadingsInStub(`${minimalStub}${heading}\n`).includes(
        heading,
      ),
      `expected checker to flag stub containing ${heading}`,
    );
  }
});

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
