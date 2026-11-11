import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(repoRoot, "scripts/ci-changed-path-flags.sh");

/**
 * @param {readonly string[]} files
 */
function runWorkflowPathFlags(files) {
  const result = spawnSync("bash", [scriptPath], {
    cwd: repoRoot,
    encoding: "utf8",
    input: files.length ? `${files.join("\n")}\n` : "",
    env: (() => {
      const env = { ...process.env };
      delete env.GITHUB_OUTPUT;
      return env;
    })(),
  });
  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout || "ci-changed-path-flags.sh failed",
  );
  /** @type {{ frontend: boolean, rust: boolean, manual: boolean, agentdocs: boolean }} */
  const flags = {
    frontend: false,
    rust: false,
    manual: false,
    agentdocs: false,
  };
  for (const line of result.stdout.trim().split("\n")) {
    const match = /^(frontend|rust|manual|agentdocs)=(true|false)$/.exec(line);
    assert.ok(match, `unexpected output line: ${line}`);
    flags[/** @type {keyof typeof flags} */ (match[1])] = match[2] === "true";
  }
  return flags;
}

/**
 * @param {readonly string[]} files
 * @param {{ frontend?: boolean, rust?: boolean, manual?: boolean, agentdocs?: boolean }} expected
 */
function assertFlags(files, expected) {
  const flags = runWorkflowPathFlags(files);
  assert.deepEqual(flags, {
    frontend: expected.frontend ?? false,
    rust: expected.rust ?? false,
    manual: expected.manual ?? false,
    agentdocs: expected.agentdocs ?? false,
  });
}

test("ci.yml changes job pipes git diff into ci-changed-path-flags.sh", () => {
  const yml = fs.readFileSync(
    path.join(repoRoot, ".github/workflows/ci.yml"),
    "utf8",
  );
  assert.match(
    yml,
    /git diff --name-only "\$BASE" "\$HEAD" \| bash scripts\/ci-changed-path-flags\.sh/,
  );
  assert.doesNotMatch(
    yml,
    /AGENTS\.md\|docs\/agents-\*/,
    "workflow should not duplicate path case arms inline",
  );
});

test("ci workflow script: build-user-manual-site.mjs is manual only", () => {
  assertFlags(["scripts/build-user-manual-site.mjs"], { manual: true });
});

test("ci workflow script: manual-site render.mjs is manual only", () => {
  assertFlags(["scripts/manual-site/render.mjs"], { manual: true });
});

test("ci workflow script: ci.yml is frontend and rust", () => {
  assertFlags([".github/workflows/ci.yml"], { frontend: true, rust: true });
});

test("ci workflow script: pages.yml is frontend and rust", () => {
  assertFlags([".github/workflows/pages.yml"], {
    frontend: true,
    rust: true,
  });
});

test("ci workflow script: docs agents non-md still sets agentdocs only", () => {
  assertFlags(["docs/agents-note.txt"], { agentdocs: true });
});

test("ci workflow script: rules non-mdc still sets agentdocs only", () => {
  assertFlags([".cursor/rules/notes.txt"], { agentdocs: true });
});

test("ci workflow script: check-agent-docs files are agentdocs only", () => {
  assertFlags(
    ["scripts/check-agent-docs.mjs", "scripts/check-agent-docs.test.mjs"],
    { agentdocs: true },
  );
});

test("ci workflow script: ci-changed-path-flags files are frontend only", () => {
  assertFlags(
    ["scripts/ci-changed-path-flags.sh", "scripts/ci-changed-path-flags.test.mjs"],
    { frontend: true },
  );
});

test("ci workflow script: write-schedule SKILL is frontend and agentdocs", () => {
  assertFlags([".cursor/skills/write-schedule/SKILL.md"], {
    frontend: true,
    agentdocs: true,
  });
});

test("ci workflow script: schedule-talk reference is rust and agentdocs", () => {
  assertFlags(
    [".cursor/skills/schedule-talk/references/consultation-flow.md"],
    { rust: true, agentdocs: true },
  );
});

test("ci workflow script: src App is frontend only", () => {
  assertFlags(["src/App.tsx"], { frontend: true });
});

test("ci workflow script: src-tauri lib is rust only", () => {
  assertFlags(["src-tauri/src/lib.rs"], { rust: true });
});

test("ci workflow script: consult rule and session are agentdocs only", () => {
  assertFlags(
    [
      ".cursor/rules/consult.mdc",
      ".cursor/skills/consult/references/session.md",
    ],
    { agentdocs: true },
  );
});
