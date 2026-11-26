import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("check-mcp-tool-names matches TS and Rust", () => {
  const result = spawnSync("npx", ["tsx", "scripts/check-mcp-tool-names.ts"], {
    encoding: "utf8",
    cwd: new URL("..", import.meta.url).pathname,
  });
  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout || "check-mcp-tool-names exited non-zero",
  );
});
