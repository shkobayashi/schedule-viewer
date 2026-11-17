import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { handleBeforeReadFile } from "../.cursor/hooks/log-consult-session-read.mjs";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOK_SCRIPT = path.join(
  REPO_ROOT,
  ".cursor/hooks/log-consult-session-read.mjs",
);
const SESSION_ABS = path.join(
  REPO_ROOT,
  ".cursor/skills/consult/references/session.md",
);

/**
 * @param {unknown} stdinJson
 * @param {Record<string, string>} [env]
 */
function runHookWithStdin(stdinJson, env = {}) {
  const input = JSON.stringify(stdinJson);
  return spawnSync(process.execPath, [HOOK_SCRIPT], {
    input,
    encoding: "utf8",
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
  });
}

test("consult session read logs marker and always allows", () => {
  const logPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "consult-read-")),
    "agent-obs.jsonl",
  );
  try {
    const hookResult = runHookWithStdin(
      { file_path: SESSION_ABS, content: "x" },
      { AGENT_OBS_LOG_PATH: logPath },
    );
    assert.equal(hookResult.status, 0);
    assert.match(
      hookResult.stderr,
      /\[agent-obs\] hook=consult-session-read decision=log path=\.cursor\/skills\/consult\/references\/session\.md/,
    );
    const payload = JSON.parse(hookResult.stdout.trim());
    assert.equal(payload.permission, "allow");
    const logText = fs.readFileSync(logPath, "utf8");
    assert.match(logText, /consult-session-read/);
  } finally {
    fs.rmSync(path.dirname(logPath), { recursive: true, force: true });
  }
});

test("non-session read stays silent", () => {
  const logPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "consult-read-")),
    "agent-obs.jsonl",
  );
  try {
    const hookResult = runHookWithStdin(
      { file_path: path.join(REPO_ROOT, "README.md"), content: "" },
      { AGENT_OBS_LOG_PATH: logPath },
    );
    assert.equal(hookResult.stderr, "");
    assert.equal(JSON.parse(hookResult.stdout.trim()).permission, "allow");
    assert.equal(fs.existsSync(logPath), false);
  } finally {
    fs.rmSync(path.dirname(logPath), { recursive: true, force: true });
  }
});

test("handleBeforeReadFile tolerates malformed input", () => {
  assert.deepEqual(handleBeforeReadFile(null), { permission: "allow" });
  assert.deepEqual(handleBeforeReadFile([]), { permission: "allow" });
});