import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CLAUSE_MOVE_SPLIT_REL,
  IMPLEMENT_CHANGE_SCREEN_REL,
  collectClauseMoveErrors,
  collectLinkErrors,
  extractMarkdownLinkTargets,
  markdownForLinkScan,
  resolveRelativeFileLink,
  stripFencedCodeBlocks,
  validateSkillFrontmatter,
} from "./check-agent-docs.mjs";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const repoSplitDoc = fs.readFileSync(
  path.join(repoRoot, CLAUSE_MOVE_SPLIT_REL),
  "utf8",
);

function minimalScreenClauses51to57(overrides = {}) {
  const lines = [];
  for (let n = 51; n <= 57; n += 1) {
    lines.push(`${n}. ${overrides[n] ?? "stub clause text."}`);
  }
  return `## 画面と操作\n\n${lines.join("\n")}\n`;
}

function writeClauseFixtures(root, { splitMarkdown, screenMarkdown }) {
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.mkdirSync(path.join(root, ".cursor/skills/implement-change/references"), {
    recursive: true,
  });
  fs.writeFileSync(path.join(root, CLAUSE_MOVE_SPLIT_REL), splitMarkdown);
  fs.writeFileSync(path.join(root, IMPLEMENT_CHANGE_SCREEN_REL), screenMarkdown);
}

function writeMinimalAgentDocRoot(root) {
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.mkdirSync(path.join(root, ".cursor/rules"), { recursive: true });
  fs.writeFileSync(path.join(root, "AGENTS.md"), "agent doc checker fixture root\n");
}

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

test("resolveRelativeFileLink accepts existing directory target", () => {
  const root = tempRepoRoot();
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "AGENTS.md"), "stub\n");
  const result = resolveRelativeFileLink(root, "AGENTS.md", "docs");
  assert.equal(result.ok, true);
});

test("inline backtick link is ignored after fence strip", () => {
  const md = "Example `[broken](missing.md)` in prose.\n";
  const stripped = markdownForLinkScan(md);
  assert.deepEqual(extractMarkdownLinkTargets(stripped), []);
});

test("unquoted broken prose link still fails", () => {
  const root = tempRepoRoot();
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.mkdirSync(path.join(root, ".cursor/skills"), { recursive: true });
  fs.mkdirSync(path.join(root, ".cursor/rules"), { recursive: true });
  fs.writeFileSync(path.join(root, "AGENTS.md"), "stub\n");
  fs.writeFileSync(
    path.join(root, "docs", "agents-a.md"),
    "See [x](no-such.md) in prose.\n",
  );
  const errors = collectLinkErrors(root);
  assert.ok(errors.some((e) => e.includes("broken relative link")));
});

test("validateSkillFrontmatter rejects empty quoted description", () => {
  const content = `---
name: sample-skill
description: ""
---

# body
`;
  const errors = validateSkillFrontmatter(content, ".cursor/skills/sample/SKILL.md");
  assert.deepEqual(errors, [
    '.cursor/skills/sample/SKILL.md: frontmatter "description" is required',
  ]);
});

test("clause move table rejects destination 58 for old 54", () => {
  const root = tempRepoRoot();
  const split = repoSplitDoc.replace("| 54 | 57 |", "| 54 | 58 |");
  writeClauseFixtures(root, {
    splitMarkdown: split,
    screenMarkdown: minimalScreenClauses51to57(),
  });
  const errors = collectClauseMoveErrors(root);
  assert.ok(
    errors.some((e) => e.includes("missing or wrong required pair 54→57")),
    errors.join("; "),
  );
});

test("clause move table rejects missing pair for old 52", () => {
  const root = tempRepoRoot();
  const split = repoSplitDoc.replace(/\| 52 \| 55 \|\n/, "");
  writeClauseFixtures(root, {
    splitMarkdown: split,
    screenMarkdown: minimalScreenClauses51to57(),
  });
  const errors = collectClauseMoveErrors(root);
  assert.ok(
    errors.some((e) => e.includes("missing or wrong required pair 52→55")),
    errors.join("; "),
  );
});

test("clause move table rejects duplicate new 55", () => {
  const root = tempRepoRoot();
  const split = repoSplitDoc.replace(
    "| 54 | 57 |",
    "| 54 | 57 |\n| 99 | 55 |",
  );
  writeClauseFixtures(root, {
    splitMarkdown: split,
    screenMarkdown: minimalScreenClauses51to57(),
  });
  const errors = collectClauseMoveErrors(root);
  assert.ok(
    errors.some((e) => e.includes("duplicate new clause 55")),
    errors.join("; "),
  );
});

test("clause move table rejects duplicate old 52", () => {
  const root = tempRepoRoot();
  const split = repoSplitDoc.replace("| 52 | 55 |", "| 52 | 55 |\n| 52 | 56 |");
  writeClauseFixtures(root, {
    splitMarkdown: split,
    screenMarkdown: minimalScreenClauses51to57(),
  });
  const errors = collectClauseMoveErrors(root);
  assert.ok(
    errors.some((e) => e.includes("duplicate old clause 52")),
    errors.join("; "),
  );
});

test("clause move table rejects indented duplicate new 55", () => {
  const root = tempRepoRoot();
  const split = repoSplitDoc.replace(
    "| 54 | 57 |",
    "| 54 | 57 |\n | 99 | 55 |",
  );
  writeClauseFixtures(root, {
    splitMarkdown: split,
    screenMarkdown: minimalScreenClauses51to57(),
  });
  const errors = collectClauseMoveErrors(root);
  assert.ok(
    errors.some((e) => e.includes("duplicate new clause 55")),
    errors.join("; "),
  );
});

test("clause move table rejects single-cell malformed row", () => {
  const root = tempRepoRoot();
  const split = repoSplitDoc.replace(
    "| 53 | 56 |",
    "| 53 | 56 |\n| not-a-pair |",
  );
  writeClauseFixtures(root, {
    splitMarkdown: split,
    screenMarkdown: minimalScreenClauses51to57(),
  });
  const errors = collectClauseMoveErrors(root);
  assert.ok(
    errors.some((e) => e.includes("malformed row")),
    errors.join("; "),
  );
});

test("clause move table accepts indented valid mapping row", () => {
  const root = tempRepoRoot();
  const split = repoSplitDoc.replace("| 53 | 56 |", " | 53 | 56 |");
  writeClauseFixtures(root, {
    splitMarkdown: split,
    screenMarkdown: minimalScreenClauses51to57(),
  });
  assert.deepEqual(collectClauseMoveErrors(root), []);
});

test("clause move table rejects mixed numeric and new header cell after data", () => {
  const root = tempRepoRoot();
  const split = repoSplitDoc.replace(
    "| 54 | 57 |",
    "| 54 | 57 |\n| 99 | 新番号 |",
  );
  writeClauseFixtures(root, {
    splitMarkdown: split,
    screenMarkdown: minimalScreenClauses51to57(),
  });
  const errors = collectClauseMoveErrors(root);
  assert.ok(
    errors.some((e) => e.includes("malformed row")),
    errors.join("; "),
  );
});

test("clause move table rejects mixed old header cell and numeric after data", () => {
  const root = tempRepoRoot();
  const split = repoSplitDoc.replace(
    "| 54 | 57 |",
    "| 54 | 57 |\n| 旧番号 | 99 |",
  );
  writeClauseFixtures(root, {
    splitMarkdown: split,
    screenMarkdown: minimalScreenClauses51to57(),
  });
  const errors = collectClauseMoveErrors(root);
  assert.ok(
    errors.some((e) => e.includes("malformed row")),
    errors.join("; "),
  );
});

test("clause move table rejects repeated header row after data", () => {
  const root = tempRepoRoot();
  const split = repoSplitDoc.replace(
    "| 54 | 57 |",
    "| 54 | 57 |\n| 旧番号 | 新番号 |",
  );
  writeClauseFixtures(root, {
    splitMarkdown: split,
    screenMarkdown: minimalScreenClauses51to57(),
  });
  const errors = collectClauseMoveErrors(root);
  assert.ok(
    errors.some((e) => e.includes("malformed row")),
    errors.join("; "),
  );
});

test("clause move table accepts extra mapping rows after required pairs", () => {
  const root = tempRepoRoot();
  const split = repoSplitDoc.replace(
    "| 54 | 57 |",
    "| 54 | 57 |\n| 60 | 70 |",
  );
  writeClauseFixtures(root, {
    splitMarkdown: split,
    screenMarkdown: minimalScreenClauses51to57(),
  });
  assert.deepEqual(collectClauseMoveErrors(root), []);
});

test("clause move table rejects malformed mapping row", () => {
  const root = tempRepoRoot();
  const split = repoSplitDoc.replace(
    "| 53 | 56 |",
    "| fifty-three | fifty-six |",
  );
  writeClauseFixtures(root, {
    splitMarkdown: split,
    screenMarkdown: minimalScreenClauses51to57(),
  });
  const errors = collectClauseMoveErrors(root);
  assert.ok(
    errors.some((e) => e.includes("malformed row")),
    errors.join("; "),
  );
  assert.ok(
    errors.some((e) => e.includes("missing or wrong required pair 53→56")),
    errors.join("; "),
  );
});

test("reworded screen clause 55 still passes", () => {
  const root = tempRepoRoot();
  writeClauseFixtures(root, {
    splitMarkdown: repoSplitDoc,
    screenMarkdown: minimalScreenClauses51to57({
      55: "Reworded effect dependency rule only; number unchanged.",
    }),
  });
  assert.deepEqual(collectClauseMoveErrors(root), []);
});

test("screen missing live clause 55 fails", () => {
  const root = tempRepoRoot();
  const screen = minimalScreenClauses51to57().replace(/^55\. .*\n/m, "");
  writeClauseFixtures(root, {
    splitMarkdown: repoSplitDoc,
    screenMarkdown: screen,
  });
  const errors = collectClauseMoveErrors(root);
  assert.ok(
    errors.some((e) => e.includes("clause 55 must appear exactly once (found 0)")),
    errors.join("; "),
  );
});

test("screen duplicate live clause 55 fails", () => {
  const root = tempRepoRoot();
  const screen = minimalScreenClauses51to57().replace(
    /^55\. /m,
    "55. first.\n55. ",
  );
  writeClauseFixtures(root, {
    splitMarkdown: repoSplitDoc,
    screenMarkdown: screen,
  });
  const errors = collectClauseMoveErrors(root);
  assert.ok(
    errors.some((e) => e.includes("clause 55 must appear exactly once (found 2)")),
    errors.join("; "),
  );
});

test("screen missing live clauses 52 to 54 fails", () => {
  const root = tempRepoRoot();
  const screen = minimalScreenClauses51to57();
  const withoutSplit = screen
    .replace(/^52\. .*\n/m, "")
    .replace(/^53\. .*\n/m, "")
    .replace(/^54\. .*\n/m, "");
  writeClauseFixtures(root, {
    splitMarkdown: repoSplitDoc,
    screenMarkdown: withoutSplit,
  });
  const errors = collectClauseMoveErrors(root);
  assert.ok(errors.some((e) => e.includes("clause 52")));
  assert.ok(errors.some((e) => e.includes("clause 53")));
  assert.ok(errors.some((e) => e.includes("clause 54")));
});

test("repository clause move table and screen clauses pass", () => {
  assert.deepEqual(collectClauseMoveErrors(repoRoot), []);
});

test("check-agent-docs command fails on clause move mutation", () => {
  const root = tempRepoRoot();
  writeMinimalAgentDocRoot(root);
  const split = repoSplitDoc.replace("| 54 | 57 |", "| 54 | 58 |");
  writeClauseFixtures(root, {
    splitMarkdown: split,
    screenMarkdown: minimalScreenClauses51to57(),
  });
  const script = path.join(repoRoot, "scripts/check-agent-docs.mjs");
  const result = spawnSync(process.execPath, [script, root], {
    encoding: "utf8",
    cwd: repoRoot,
  });
  assert.notEqual(result.status, 0, result.stdout || "expected non-zero exit");
  assert.match(
    result.stderr,
    /missing or wrong required pair 54→57|check-agent-docs failed/,
  );
});
