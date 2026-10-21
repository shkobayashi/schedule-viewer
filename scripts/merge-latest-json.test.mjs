import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { mergeLatestManifests } from "./merge-latest-json.mjs";

const scriptPath = fileURLToPath(new URL("./merge-latest-json.mjs", import.meta.url));

test("mergeLatestManifests merges platforms with matching version", () => {
  const merged = mergeLatestManifests(
    [
      {
        version: "1.0.0",
        platforms: { "linux-x86_64": { url: "a", signature: "s1" } },
      },
      {
        version: "1.0.0",
        platforms: { "darwin-aarch64": { url: "b", signature: "s2" } },
      },
    ],
    ["linux-x86_64", "darwin-aarch64"],
  );
  assert.equal(merged.version, "1.0.0");
  assert.ok(merged.platforms["linux-x86_64"]);
  assert.ok(merged.platforms["darwin-aarch64"]);
});

test("mergeLatestManifests fails when a required platform is missing", () => {
  assert.throws(
    () =>
      mergeLatestManifests(
        [
          {
            version: "1.0.0",
            platforms: { "linux-x86_64": { url: "a", signature: "s1" } },
          },
          {
            version: "1.0.0",
            platforms: { "darwin-aarch64": { url: "b", signature: "s2" } },
          },
        ],
        ["linux-x86_64", "darwin-aarch64", "windows-x86_64"],
      ),
    /missing platform windows-x86_64/,
  );
});

test("CLI fails for beta required keys without windows-x86_64", () => {
  const dir = mkdtempSync(join(tmpdir(), "merge-latest-"));
  const linux = join(dir, "linux.json");
  const darwin = join(dir, "darwin.json");
  const out = join(dir, "latest.json");
  writeFileSync(
    linux,
    `${JSON.stringify({
      version: "1.0.0",
      platforms: { "linux-x86_64": { url: "a", signature: "s1" } },
    })}\n`,
  );
  writeFileSync(
    darwin,
    `${JSON.stringify({
      version: "1.0.0",
      platforms: { "darwin-aarch64": { url: "b", signature: "s2" } },
    })}\n`,
  );
  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--require",
      "linux-x86_64",
      "--require",
      "darwin-aarch64",
      "--require",
      "windows-x86_64",
      linux,
      darwin,
      out,
    ],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing platform windows-x86_64/);
});
