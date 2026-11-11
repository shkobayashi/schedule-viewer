import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  collectAgentDocRelPaths,
  collectLinkErrors,
  markdownForLinkScan,
  resolveRelativeFileLink,
  validateSkillFrontmatter,
} from "./check-agent-docs.mjs";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = ".cursor/skills/implement-change";
const entryRel = `${skillRoot}/SKILL.md`;

function readRel(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

/** @param {string} text @param {string} sourceRel */
function normalizeMarkdownLinks(text, sourceRel) {
  const stripped = markdownForLinkScan(text);
  return stripped.replace(/!?\[[^\]]*\]\(([^)]+)\)/g, (full, url) => {
    const trimmed = url.trim();
    if (/^(https?:|mailto:|tel:|data:)/i.test(trimmed)) {
      return full;
    }
    const hashIndex = trimmed.indexOf("#");
    const pathPart = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
    const hash = hashIndex >= 0 ? trimmed.slice(hashIndex) : "";
    if (pathPart.length === 0) {
      return full;
    }
    const result = resolveRelativeFileLink(repoRoot, sourceRel, pathPart);
    if (!result.ok) {
      return full;
    }
    const relToRepo = path.relative(repoRoot, result.target).split(path.sep).join("/");
    const label = full.match(/^!?\[([^\]]*)\]/)?.[1] ?? "";
    return `[${label}](${relToRepo}${hash})`;
  });
}

function revertEntryPointerPhrases(head) {
  return head
    .replace(
      /\[画面と操作（条項 1–57）\]\([^)]+\) の条項は全文を残す/g,
      "本 SKILL の **1–57** は全文を残す",
    )
    .replace(
      /手順の全文は、下の「どの節を読むか」の表で当たる reference の\*\*最も近い既存条項の直後\*\*/g,
      "手順の全文は本 SKILL の**最も近い既存条項の直後**",
    );
}

function stripRoutingSection(entry) {
  const start = entry.indexOf("## どの節を読むか");
  const shoumae = entry.indexOf("## 着手前");
  if (start < 0 || shoumae < start) {
    throw new Error("routing section boundaries missing");
  }
  return `${entry.slice(0, start).trimEnd()}\n\n${entry.slice(shoumae).trimStart()}`;
}

function recombineFromSplit() {
  const entry = readRel(entryRel);
  const strippedEntry = stripRoutingSection(entry);
  const idxDone = strippedEntry.indexOf("## 完了条件");
  const idxShoumae = strippedEntry.indexOf("## 着手前");
  let head = strippedEntry.slice(0, idxShoumae).trimEnd();
  head = revertEntryPointerPhrases(head);
  let shoumae = strippedEntry.slice(idxShoumae, idxDone).trimEnd();
  shoumae = shoumae.replace(
    "具体条項の全文は下の「どの節を読むか」の表が指す reference（削らない）",
    "具体条項の全文は本 SKILL（削らない）",
  );
  const done = strippedEntry.slice(idxDone).trimEnd();

  let screen = readRel(`${skillRoot}/references/screen.md`);
  screen = screen.replace(/^## 画面と操作[^\n]+\n\n/, "");

  const state = readRel(`${skillRoot}/references/state.md`).trimEnd();
  const docs = readRel(`${skillRoot}/references/docs.md`).trimEnd();
  const tests = readRel(`${skillRoot}/references/tests.md`).trimEnd();

  return `${head}\n\n${shoumae}\n\n${screen}\n\n${state}\n\n${docs}\n\n${tests}\n\n${done}\n`;
}

/** @param {string} text @param {string} sourceRel */
function normalizeBody(text, sourceRel) {
  const depthFromSkill = sourceRel.includes("/references/")
    ? "../../../../"
    : "../../../";
  const uplifted = text
    .replace(/\]\(\.\.\/\.\.\/\.\.\/\.\.\//g, `](${depthFromSkill}`)
    .replace(/\]\(\.\.\/\.\.\/review-implementation\//g, "](../review-implementation/");
  return normalizeMarkdownLinks(uplifted, sourceRel);
}

test("implement-change references are scanned by the agent-doc checker", () => {
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
  assert.match(readRel(`${skillRoot}/references/screen.md`), /^53\. /m);
  assert.match(readRel(`${skillRoot}/references/state.md`), /^17\. /m);
  assert.match(readRel(`${skillRoot}/references/state.md`), /^28\. /m);
  assert.match(readRel(`${skillRoot}/references/state.md`), /^29\. /m);
  assert.match(readRel(`${skillRoot}/references/tests.md`), /^13\. /m);
  assert.match(entry, /^5\. /m);
  assert.match(entry, /^7\. /m);
});

test("split recombine preserves base prose aside from allowed entry routing", () => {
  let base;
  const tmpBase = "/tmp/implement-change-skill-base.md";
  if (fs.existsSync(tmpBase)) {
    base = fs.readFileSync(tmpBase, "utf8");
  } else {
    base = execSync("git show 16b5aed2359d6782601cd0971ffcc3586b588018:.cursor/skills/implement-change/SKILL.md", {
      cwd: repoRoot,
      encoding: "utf8",
    });
  }
  const recombined = recombineFromSplit();
  const normBase = normalizeBody(base, entryRel);
  const normRecombined = normalizeBody(recombined, entryRel);
  if (normBase !== normRecombined) {
    const baseParas = normBase.split(/\n\n+/);
    const newParas = normRecombined.split(/\n\n+/);
    assert.equal(
      baseParas.length,
      newParas.length,
      `paragraph count base=${baseParas.length} recombined=${newParas.length}`,
    );
    for (let i = 0; i < baseParas.length; i++) {
      assert.equal(
        baseParas[i],
        newParas[i],
        `paragraph ${i + 1} differs`,
      );
    }
  }
});
