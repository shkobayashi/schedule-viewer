import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  collectLinkErrors,
  extractMarkdownLinkTargets,
  resolveRelativeFileLink,
  stripFencedCodeBlocks,
  validateSkillFrontmatter,
} from "./check-agent-docs.mjs";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function tempRepoRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "check-agent-docs-"));
}

test("stripFencedCodeBlocks removes fenced links", () => {
  const md = "See [ok](ok.md)\n```md\n[hidden](missing.md)\n```\n";
  const stripped = stripFencedCodeBlocks(md);
  assert.deepEqual(extractMarkdownLinkTargets(stripped), ["ok.md"]);
});

test("resolveRelativeFileLink rejects broken relative link", () => {
  const root = tempRepoRoot();
  const docsDir = path.join(root, "docs");
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(path.join(root, ".cursor/skills"), { recursive: true });
  fs.mkdirSync(path.join(root, ".cursor/rules"), { recursive: true });
  fs.writeFileSync(path.join(root, "AGENTS.md"), "stub\n");
  fs.writeFileSync(
    path.join(docsDir, "agents-a.md"),
    "[x](../missing.md)\n",
  );
  const errors = collectLinkErrors(root);
  assert.ok(errors.some((e) => e.includes("broken relative link")));
});

test("validateSkillFrontmatter rejects missing description", () => {
  const content = `---
name: sample-skill
---

# body
`;
  const errors = validateSkillFrontmatter(content, ".cursor/skills/sample/SKILL.md");
  assert.deepEqual(errors, [
    '.cursor/skills/sample/SKILL.md: frontmatter "description" is required',
  ]);
});

test("valid relative links and frontmatter pass in fixture tree", () => {
  const root = tempRepoRoot();
  fs.writeFileSync(path.join(root, "AGENTS.md"), "[map](docs/agents-map.md)\n");
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "agents-map.md"), "ok\n");
  fs.mkdirSync(path.join(root, ".cursor/skills/demo"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".cursor/skills/demo/SKILL.md"),
    `---
name: demo
description: Demo skill for fixture.
---

[rule](../../rules/demo.mdc)
`,
  );
  fs.mkdirSync(path.join(root, ".cursor/rules"), { recursive: true });
  fs.writeFileSync(path.join(root, ".cursor/rules/demo.mdc"), "ok\n");
  const errors = collectLinkErrors(root);
  assert.deepEqual(errors, []);
});

test("check-agent-docs passes on repository agent-doc tree", () => {
  const result = spawnSync(process.execPath, ["scripts/check-agent-docs.mjs"], {
    encoding: "utf8",
    cwd: repoRoot,
  });
  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout || "check-agent-docs exited non-zero",
  );
  assert.match(result.stdout, /AGENTS\.md: \d+ bytes/);
});

test("resolveRelativeFileLink accepts external URL without file check", () => {
  const root = tempRepoRoot();
  const result = resolveRelativeFileLink(
    root,
    "AGENTS.md",
    "https://example.com/doc.md",
  );
  assert.equal(result.ok, true);
});
