import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import {
  classifyHookInput,
  classifyShellCommand,
} from "../.cursor/hooks/block-history-rewrite.mjs";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOK_SCRIPT = path.join(
  REPO_ROOT,
  ".cursor/hooks/block-history-rewrite.mjs",
);

/**
 * @param {unknown} stdinJson
 */
function runHookWithStdin(stdinJson) {
  const input = JSON.stringify(stdinJson);
  return spawnSync(process.execPath, [HOOK_SCRIPT], {
    input,
    encoding: "utf8",
    cwd: REPO_ROOT,
  });
}

test("allows ordinary status commit push and merge", () => {
  const allowed = [
    "git status",
    "git commit -m \"weekly update\"",
    "git push origin feature-436",
    "git merge develop",
    "git log -3",
  ];
  for (const command of allowed) {
    const result = classifyShellCommand(command);
    assert.equal(
      result.permission,
      "allow",
      `expected allow for ${command}`,
    );
  }
});

test("denies commit amend through global options and wrappers", () => {
  const denied = [
    "git commit --amend",
    "git commit --amend --no-edit",
    "git -C /tmp/repo commit --amend",
    "env git commit --amend -m \"msg\"",
    "command git commit --amend",
    "bash -lc \"git commit --amend\"",
    "sh -c 'git commit --amend'",
  ];
  for (const command of denied) {
    const result = classifyShellCommand(command);
    assert.equal(
      result.permission,
      "deny",
      `expected deny for ${command}`,
    );
  }
});

test("denies force push flags short clusters and plus refspecs", () => {
  const denied = [
    "git push --force",
    "git push --force-with-lease",
    "git push --force-if-includes",
    "git push origin main -f",
    "git push -f",
    "git push origin +main:main",
    "git push +refs/heads/main:refs/heads/main",
  ];
  for (const command of denied) {
    const result = classifyShellCommand(command);
    assert.equal(
      result.permission,
      "deny",
      `expected deny for ${command}`,
    );
  }
});

test("denies rebase and pull rebase but allows rebase false", () => {
  assert.equal(classifyShellCommand("git rebase main").permission, "deny");
  assert.equal(classifyShellCommand("git pull --rebase").permission, "deny");
  assert.equal(classifyShellCommand("git pull -r origin main").permission, "deny");
  assert.equal(classifyShellCommand("git pull --rebase=false").permission, "allow");
  assert.equal(classifyShellCommand("git pull --no-rebase").permission, "allow");
});

test("allows quoted text that mentions forbidden words", () => {
  assert.equal(
    classifyShellCommand("echo 'git rebase --onto HEAD~3'").permission,
    "allow",
  );
  assert.equal(
    classifyShellCommand("git commit -m \"do not --amend history\"").permission,
    "allow",
  );
});

test("denies a forbidden command after a chain operator", () => {
  const result = classifyShellCommand("git status && git commit --amend");
  assert.equal(result.permission, "deny");
});

test("malformed hook input denies with json", () => {
  for (const badInput of [
    null,
    [],
    {},
    { command: 1 },
    "{not-json",
  ]) {
    let hookResult;
    if (typeof badInput === "string") {
      hookResult = spawnSync(process.execPath, [HOOK_SCRIPT], {
        input: badInput,
        encoding: "utf8",
        cwd: REPO_ROOT,
      });
    } else {
      const classified = classifyHookInput(badInput);
      assert.equal(classified.permission, "deny");
      hookResult = runHookWithStdin(badInput);
    }
    assert.equal(hookResult.status, 0, "hook exits 0 on deny");
    const payload = JSON.parse(hookResult.stdout.trim());
    assert.equal(payload.permission, "deny");
    assert.ok(payload.agent_message);
  }
});

test("stdin fixtures do not execute the command", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "block-history-rewrite-"));
  const sentinel = path.join(dir, "SHOULD_NOT_EXIST");
  try {
    const command = `git commit --amend && touch ${JSON.stringify(sentinel)}`;
    const hookResult = runHookWithStdin({ command, cwd: dir, sandbox: false });
    assert.equal(hookResult.status, 0);
    const payload = JSON.parse(hookResult.stdout.trim());
    assert.equal(payload.permission, "deny");
    assert.equal(fs.existsSync(sentinel), false);
    const allowed = runHookWithStdin({
      command: `echo quoted > ${JSON.stringify(path.join(dir, "ALSO_NONE"))}`,
      cwd: dir,
    });
    assert.equal(allowed.status, 0);
    assert.equal(JSON.parse(allowed.stdout.trim()).permission, "allow");
    assert.equal(fs.existsSync(path.join(dir, "ALSO_NONE")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("sandbox and confirmation words do not allow a rewrite", () => {
  const denied = [
    "sandbox=true git push --force",
    "git push --force # user confirmed",
    "CONFIRMED=1 git rebase -i HEAD~2",
    "git -c advice.pushNonFF=false push -f origin main",
    "true && git rebase main",
  ];
  for (const command of denied) {
    const result = classifyHookInput({ command, sandbox: true });
    assert.equal(
      result.permission,
      "deny",
      `expected deny for ${command}`,
    );
  }
});

test("substitution with rewrite is denied", () => {
  assert.equal(
    classifyShellCommand("echo $(git commit --amend)").permission,
    "deny",
  );
});

test("unbalanced double quotes deny", () => {
  assert.equal(
    classifyShellCommand('git commit -m "open quote').permission,
    "deny",
  );
});

test("empty command is allowed", () => {
  assert.equal(classifyShellCommand("").permission, "allow");
  assert.equal(classifyShellCommand("   ").permission, "allow");
});
