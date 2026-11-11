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

test("denies substitutions inside double quotes and commit -m with them", () => {
  const denied = [
    'echo "$(git commit --amend)"',
    'git commit -m "$(git commit --amend)"',
    "echo `git commit --amend`",
    'echo "`git commit --amend`"',
  ];
  for (const command of denied) {
    assert.equal(
      classifyShellCommand(command).permission,
      "deny",
      `expected deny for ${command}`,
    );
  }
  assert.equal(
    classifyShellCommand("echo 'git commit --amend'").permission,
    "allow",
  );
  assert.equal(
    classifyShellCommand('echo "git commit --amend"').permission,
    "allow",
  );
});

test("backslash outside quotes preserves argv boundaries for amend", () => {
  assert.equal(classifyShellCommand("git commit \\--amend").permission, "deny");
  assert.equal(classifyShellCommand("git\\ commit --amend").permission, "allow");
});

test("pull rebase flag order terminator and qr cluster", () => {
  assert.equal(
    classifyShellCommand("git pull --rebase=false --rebase").permission,
    "deny",
  );
  assert.equal(
    classifyShellCommand("git pull --rebase --rebase=false").permission,
    "allow",
  );
  assert.equal(
    classifyShellCommand("git pull -qr origin main").permission,
    "deny",
  );
  assert.equal(
    classifyShellCommand("git pull -- --rebase").permission,
    "allow",
  );
});

test("git globals support documented options and deny unknown globals", () => {
  assert.equal(classifyShellCommand("git -p status").permission, "allow");
  assert.equal(classifyShellCommand("git -P log -1").permission, "allow");
  assert.equal(classifyShellCommand("git -C /tmp/repo status").permission, "allow");
  assert.equal(classifyShellCommand("git -c advice.statusHints=false status").permission, "allow");
  assert.equal(
    classifyShellCommand("git -cuser.name=x commit --amend").permission,
    "deny",
  );
  assert.equal(
    classifyShellCommand("git --exec-path=/usr/bin status").permission,
    "allow",
  );
  assert.equal(
    classifyShellCommand("git --no-replace-objects status").permission,
    "allow",
  );
  assert.equal(classifyShellCommand("git --nonsense status").permission, "deny");
});

test("shell dash c skips long rcfile options", () => {
  const denied = [
    'bash --rcfile /dev/null -c "git commit --amend"',
    "sh -c 'git commit --amend'",
    "zsh --rcs -c 'git commit --amend'",
  ];
  for (const command of denied) {
    assert.equal(
      classifyShellCommand(command).permission,
      "deny",
      `expected deny for ${command}`,
    );
  }
  assert.equal(
    classifyShellCommand("bash --rcfile /dev/null -c 'echo ok'").permission,
    "allow",
  );
});

test("env command exec wrappers peel to git", () => {
  const denied = [
    "env git commit --amend",
    "env -u PATH git push --force",
    "command git commit --amend",
    "command env git commit --amend",
    "exec -a git git commit --amend",
  ];
  for (const command of denied) {
    assert.equal(
      classifyShellCommand(command).permission,
      "deny",
      `expected deny for ${command}`,
    );
  }
  assert.equal(classifyShellCommand("env FOO=1 git status").permission, "allow");
  assert.equal(classifyShellCommand("env -i git status").permission, "allow");
  assert.equal(classifyShellCommand("command -p git status").permission, "allow");
});

test("env peeled through assignments chdir and double hyphen", () => {
  const denied = [
    "env FOO=1 git commit --amend",
    "env -i FOO=1 git commit --amend",
    "env -C /tmp git commit --amend",
    "env -- git commit --amend",
    "exec -l git commit --amend",
  ];
  for (const command of denied) {
    assert.equal(
      classifyShellCommand(command).permission,
      "deny",
      `expected deny for ${command}`,
    );
  }
  assert.equal(classifyShellCommand("env FOO=1 git status").permission, "allow");
  assert.equal(
    classifyShellCommand("env -C /tmp git -C /other status").permission,
    "allow",
  );
});

test("push force policy push options and no force independence", () => {
  assert.equal(classifyShellCommand("git push -ofollow").permission, "allow");
  assert.equal(
    classifyShellCommand("git push -o force-with-lease").permission,
    "allow",
  );
  assert.equal(
    classifyShellCommand("git push --no-force --force-with-lease").permission,
    "deny",
  );
  assert.equal(
    classifyShellCommand("git push --force=false origin main").permission,
    "allow",
  );
  assert.equal(
    classifyShellCommand("git push --no-force --force").permission,
    "deny",
  );
  assert.equal(classifyShellCommand("git push --force=true").permission, "deny");
});

test("trailing shell comments do not hide git verbs", () => {
  assert.equal(
    classifyShellCommand("git commit -m 'ok' # not --amend").permission,
    "allow",
  );
  assert.equal(
    classifyShellCommand("git push origin main # not --force").permission,
    "allow",
  );
  assert.equal(
    classifyShellCommand("git status # $(unclosed").permission,
    "allow",
  );
  assert.equal(
    classifyShellCommand("path#file git status").permission,
    "allow",
  );
});

test("pull rebase from git config global only with explicit override", () => {
  assert.equal(
    classifyShellCommand("git -c pull.rebase=true pull").permission,
    "deny",
  );
  assert.equal(
    classifyShellCommand("git -c pull.rebase=true pull --rebase=false").permission,
    "allow",
  );
  assert.equal(
    classifyShellCommand("git -c pull.rebase=true pull --no-rebase").permission,
    "allow",
  );
  assert.equal(
    classifyShellCommand("git -c pull.rebase=merges pull").permission,
    "deny",
  );
  assert.equal(
    classifyShellCommand("git -c pull.rebase=interactive pull").permission,
    "deny",
  );
  assert.equal(
    classifyShellCommand("git -c pull.rebase=false pull").permission,
    "allow",
  );
  assert.equal(
    classifyShellCommand("git -c pull.rebase=off pull --no-rebase").permission,
    "allow",
  );
});

test("git informational globals without subcommand allow", () => {
  const allowed = [
    "git",
    "git --version",
    "git --help",
    "git -h",
    "git -v",
    "git --exec-path",
    "git -p --version",
  ];
  for (const command of allowed) {
    assert.equal(
      classifyShellCommand(command).permission,
      "allow",
      `expected allow for ${command}`,
    );
  }
  assert.equal(classifyShellCommand("git --nonsense").permission, "deny");
});

test("simple grouped commands still classify git", () => {
  const denied = [
    "(git commit --amend)",
    "( git commit --amend )",
    "{ git commit --amend; }",
    "(true; git commit --amend)",
    "( git commit --amend && true )",
    "{ echo x; git commit --amend; }",
    "{ git commit --amend && git status; }",
    "((git commit --amend))",
  ];
  for (const command of denied) {
    assert.equal(
      classifyShellCommand(command).permission,
      "deny",
      `expected deny for ${command}`,
    );
  }
  const allowed = [
    "(git status)",
    "( true && git status )",
    "{ git commit -m ok; }",
    '{ echo "parens (literal)"; git status; }',
  ];
  for (const command of allowed) {
    assert.equal(
      classifyShellCommand(command).permission,
      "allow",
      `expected allow for ${command}`,
    );
  }
});

test("hooks.json registers beforeShellExecution block-history-rewrite", () => {
  const hooksPath = path.join(REPO_ROOT, ".cursor/hooks.json");
  const hooks = JSON.parse(fs.readFileSync(hooksPath, "utf8"));
  assert.equal(hooks.version, 1);
  const entries = hooks.hooks.beforeShellExecution;
  assert.ok(Array.isArray(entries) && entries.length === 1);
  const entry = entries[0];
  assert.equal(entry.command, "node .cursor/hooks/block-history-rewrite.mjs");
  assert.equal(entry.timeout, 10);
  assert.equal(entry.failClosed, true);
  assert.equal(entry.matcher, undefined);
});
