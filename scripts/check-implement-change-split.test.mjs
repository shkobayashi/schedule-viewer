import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  collectAgentDocRelPaths,
  collectLinkErrors,
  validateSkillFrontmatter,
} from "./check-agent-docs.mjs";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = ".cursor/skills/implement-change";
const entryRel = `${skillRoot}/SKILL.md`;
const selfPath = fileURLToPath(import.meta.url);

function readRel(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function assertNoHistoricalGitOrSubprocessHarness() {
  const selfSource = fs.readFileSync(selfPath, "utf8");
  for (const line of selfSource.split("\n")) {
    if (!line.startsWith("import ")) {
      continue;
    }
    assert.doesNotMatch(
      line,
      /(?:^|\/)child_process/,
      `import must not use child_process: ${line}`,
    );
  }
  assert.doesNotMatch(selfSource, /\bexecSync\s*\(/);
  assert.doesNotMatch(selfSource, /\bspawnSync\s*\(/);
  assert.doesNotMatch(selfSource, /\bspawn\s*\(/);
}

test("implement-change references are scanned by the agent-doc checker", () => {
  assertNoHistoricalGitOrSubprocessHarness();
  const rels = collectAgentDocRelPaths(repoRoot);
  for (const name of ["screen.md", "state.md", "docs.md", "tests.md"]) {
    const expected = `${skillRoot}/references/${name}`;
    assert.ok(
      rels.includes(expected),
      `collectAgentDocRelPaths must include ${expected}`,
    );
  }
  const errors = collectLinkErrors(repoRoot);
  const skillErrors = errors.filter((e) => e.includes(skillRoot));
  assert.deepEqual(
    skillErrors,
    [],
    `implement-change link/frontmatter errors: ${skillErrors.join("; ")}`,
  );
});

test("reference files do not require skill frontmatter", () => {
  for (const name of ["screen.md", "state.md", "docs.md", "tests.md"]) {
    const rel = `${skillRoot}/references/${name}`;
    const content = readRel(rel);
    const errors = validateSkillFrontmatter(content, rel);
    assert.deepEqual(errors, []);
    assert.doesNotMatch(content, /^---\r?\nname:/m);
  }
  const entryErrors = validateSkillFrontmatter(readRel(entryRel), entryRel);
  assert.deepEqual(entryErrors, []);
});

test("entry keeps before-start and completion and omits moved headings", () => {
  const entry = readRel(entryRel);
  assert.match(entry, /^---\r?\nname: implement-change/m);
  assert.match(entry, /## 着手前（原則 2 · 3 · 8）/);
  assert.match(entry, /## 完了条件（原則 1 · 7 · 8）/);
  assert.match(entry, /## どの節を読むか/);
  assert.doesNotMatch(entry, /^## 画面と操作/m);
  assert.doesNotMatch(entry, /^## 状態・モデル・描画・Tauri/m);
  assert.doesNotMatch(entry, /^## 文書（原則/m);
  assert.doesNotMatch(entry, /^## テストと確認/m);
  assert.doesNotMatch(entry, /^利用者に見える挙動/m);
});

test("moved sections keep clause numbers once", () => {
  const areas = [
    {
      file: `${skillRoot}/references/screen.md`,
      heading: "## 画面と操作",
      numbers: Array.from({ length: 57 }, (_, i) => i + 1),
    },
    {
      file: `${skillRoot}/references/state.md`,
      heading: "## 状態・モデル・描画・Tauri",
      numbers: Array.from({ length: 31 }, (_, i) => i + 1),
    },
    {
      file: `${skillRoot}/references/tests.md`,
      heading: "## テストと確認",
      numbers: Array.from({ length: 16 }, (_, i) => i + 1),
    },
  ];
  const entry = readRel(entryRel);
  const shoumaeNumbers = Array.from({ length: 9 }, (_, i) => i);
  for (const n of shoumaeNumbers) {
    const re = new RegExp(`^${n}\\. `, "m");
    assert.match(entry, re, `entry 着手前 clause ${n}`);
  }
  for (const area of areas) {
    const text = readRel(area.file);
    assert.equal(
      (text.match(new RegExp(area.heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? [])
        .length,
      1,
      `${area.file} heading once`,
    );
    for (const n of area.numbers) {
      const re = new RegExp(`^${n}\\. `, "gm");
      const count = [...text.matchAll(re)].length;
      assert.equal(count, 1, `${area.file} clause ${n} exactly once`);
    }
  }
  const testsText = readRel(`${skillRoot}/references/tests.md`);
  assert.equal(
    [...testsText.matchAll(/^3a\. /gm)].length,
    1,
    `${skillRoot}/references/tests.md clause 3a exactly once`,
  );
  assert.match(readRel(`${skillRoot}/references/screen.md`), /^53\. /m);
  assert.match(readRel(`${skillRoot}/references/state.md`), /^17\. /m);
  assert.match(readRel(`${skillRoot}/references/state.md`), /^28\. /m);
  assert.match(readRel(`${skillRoot}/references/state.md`), /^29\. /m);
  assert.match(readRel(`${skillRoot}/references/tests.md`), /^13\. /m);
  assert.match(entry, /^5\. /m);
  assert.match(entry, /^7\. /m);
});
