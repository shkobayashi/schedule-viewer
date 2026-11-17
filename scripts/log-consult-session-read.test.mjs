import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  CONSULT_SESSION_READ_MARKER,
  readPathFromPostToolUse,
} from "../.cursor/hooks/agent-obs.mjs";
import { handlePostToolUse } from "../.cursor/hooks/log-consult-session-read.mjs";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOK_SCRIPT = path.join(
  REPO_ROOT,
  ".cursor/hooks/log-consult-session-read.mjs",
);
const SESSION_ABS = path.join(
  REPO_ROOT,
  ".cursor/skills/consult/references/session.md",
);
const SESSION_REL = ".cursor/skills/consult/references/session.md";

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

function postToolReadPayload(readPath, cwd = REPO_ROOT) {
  return {
    tool_name: "Read",
    tool_input: { path: readPath },
    tool_output: "{}",
    cwd,
  };
}

test("readPathFromPostToolUse uses tool_input.path", () => {
  assert.equal(
    readPathFromPostToolUse(postToolReadPayload(SESSION_ABS)),
    SESSION_ABS,
  );
  const resolved = readPathFromPostToolUse(
    postToolReadPayload(SESSION_REL, REPO_ROOT),
  );
  assert.equal(resolved, SESSION_ABS);
});

test("consult session read returns additional_context and JSONL", () => {
  const logPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "consult-read-")),
    "agent-obs.jsonl",
  );
  try {
    const hookResult = runHookWithStdin(
      postToolReadPayload(SESSION_ABS),
      { AGENT_OBS_LOG_PATH: logPath },
    );
    assert.equal(hookResult.status, 0);
    const payload = JSON.parse(hookResult.stdout.trim());
    assert.equal(payload.additional_context, CONSULT_SESSION_READ_MARKER);
    assert.equal(hookResult.stderr, "");
    const logText = fs.readFileSync(logPath, "utf8");
    assert.match(logText, /consult-session-read/);
  } finally {
    fs.rmSync(path.dirname(logPath), { recursive: true, force: true });
  }
});

test("consult session read with relative tool_input.path", () => {
  const out = handlePostToolUse(postToolReadPayload(SESSION_REL));
  assert.equal(out.additional_context, CONSULT_SESSION_READ_MARKER);
});

test("non-session read returns empty hook output", () => {
  const logPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "consult-read-")),
    "agent-obs.jsonl",
  );
  try {
    const hookResult = runHookWithStdin(
      postToolReadPayload(path.join(REPO_ROOT, "README.md")),
      { AGENT_OBS_LOG_PATH: logPath },
    );
    assert.deepEqual(JSON.parse(hookResult.stdout.trim()), {});
    assert.equal(hookResult.stderr, "");
    assert.equal(fs.existsSync(logPath), false);
  } finally {
    fs.rmSync(path.dirname(logPath), { recursive: true, force: true });
  }
});

test("malformed postToolUse input is no-op", () => {
  assert.deepEqual(handlePostToolUse(null), {});
  assert.deepEqual(handlePostToolUse([]), {});
  assert.deepEqual(handlePostToolUse({ tool_input: "bad" }), {});
  const hookResult = runHookWithStdin("{not-json");
  assert.equal(hookResult.status, 0);
  assert.equal(hookResult.stdout.trim(), "{}");
});

test("log write failure still returns additional_context", () => {
  const blockedLog = path.join(os.tmpdir(), "agent-obs-not-writable-dir");
  const hookResult = runHookWithStdin(postToolReadPayload(SESSION_ABS), {
    AGENT_OBS_LOG_PATH: blockedLog,
  });
  assert.equal(hookResult.status, 0);
  assert.equal(
    JSON.parse(hookResult.stdout.trim()).additional_context,
    CONSULT_SESSION_READ_MARKER,
  );
});