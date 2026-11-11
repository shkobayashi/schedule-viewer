import fs from "node:fs";
import path from "node:path";
import { buildSlugSet } from "./build-user-manual-site.mjs";
import {
  HOW_TO_MANUAL_PAGES,
  HOW_TO_MANUAL_DIR,
  assertHowToManualBundleFresh,
} from "./how-to-manual-bundle.mjs";

const ALLOWED_MANUAL_FILES = new Set(
  HOW_TO_MANUAL_PAGES.map((p) => p.out),
);

const CITATION_SOURCES = [
  ".cursor/skills/how-to/SKILL.md",
  "docs/how-to-questions.md",
];

const CITATION_PATTERN = /(?:^|[\s`（(「『\[])([a-zA-Z0-9_.-]+\.md)#([^\s`）)\]」』]+)/g;

/** Detects every `…md#…` token so slash-qualified paths cannot slip past the strict pattern. */
const BROAD_CITATION_PATTERN =
  /(?:^|[\s`（(「『\[])([a-zA-Z0-9_./\\-]+\.md)#([^\s`）)\]」』]+)/g;

export const HOW_TO_QUESTION_HEADINGS = [
  "1. タスクの期間をチャート上で動かすやり方を教えて",
  "2. 絞り込みで残した行だけを HTML に書き出すやり方を教えて",
  "3. タスクを複製して、複製先の日付だけ変えるやり方を教えて",
  "4. 休日をチャートに塗るやり方を教えて",
  "5. 担当が「メンバー不明」になるときの直し方を教えて",
  "6. 未保存の画面をファイルへ保存するやり方を教えて",
  "7. キーボードで選択を隣のタスクへ移し、そのタスクを削除するやり方を教えて",
  "8. 別のプログラムがファイルを書き換えたあと、画面の変更とファイルの変更の両方を残すやり方を教えて",
];

/**
 * @param {string} markdown
 * @returns {{ file: string, fragment: string }[]}
 */
export function extractFileHeadingCitations(markdown) {
  /** @type {{ file: string, fragment: string }[]} */
  const found = [];
  for (const match of markdown.matchAll(CITATION_PATTERN)) {
    found.push({ file: match[1], fragment: match[2] });
  }
  return found;
}

/**
 * @param {string} markdown
 * @returns {{ file: string, fragment: string }[]}
 */
export function extractAllFileHeadingCitations(markdown) {
  /** @type {{ file: string, fragment: string }[]} */
  const found = [];
  for (const match of markdown.matchAll(BROAD_CITATION_PATTERN)) {
    found.push({ file: match[1], fragment: match[2] });
  }
  return found;
}

/**
 * @param {string} markdown
 * @param {string} relPath
 * @param {Map<string, Set<string>>} slugSets
 * @returns {string[]}
 */
export function validateCitationReferences(markdown, relPath, slugSets) {
  const errors = [];
  for (const { file, fragment } of extractAllFileHeadingCitations(markdown)) {
    if (file.includes("/") || file.includes("\\")) {
      errors.push(`${relPath}: slash-qualified citation ${file}#${fragment}`);
      continue;
    }
    const err = validateCitation(file, fragment, slugSets);
    if (err) {
      errors.push(`${relPath}: ${err}`);
    }
  }
  return errors;
}

/**
 * @param {string} repoRoot
 * @returns {Map<string, Set<string>>}
 */
export function manualSlugSetsFromBundle(repoRoot) {
  /** @type {Map<string, Set<string>>} */
  const map = new Map();
  const manualDir = path.join(repoRoot, HOW_TO_MANUAL_DIR);
  for (const page of HOW_TO_MANUAL_PAGES) {
    const full = path.join(manualDir, page.out);
    const markdown = fs.readFileSync(full, "utf8");
    map.set(page.out, buildSlugSet(markdown));
  }
  return map;
}

/**
 * @param {string} file
 * @param {string} fragment
 * @param {Map<string, Set<string>>} slugSets
 * @returns {string | null}
 */
export function validateCitation(file, fragment, slugSets) {
  if (!ALLOWED_MANUAL_FILES.has(file)) {
    return `unknown file ${file}`;
  }
  const slugs = slugSets.get(file);
  if (!slugs) {
    return `missing slug set for ${file}`;
  }
  if (!slugs.has(fragment)) {
    return `${file}#${fragment}`;
  }
  return null;
}

/**
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function validateDeclaredCitations(repoRoot) {
  const errors = [];
  const slugSets = manualSlugSetsFromBundle(repoRoot);
  for (const rel of CITATION_SOURCES) {
    const markdown = fs.readFileSync(path.join(repoRoot, rel), "utf8");
    errors.push(...validateCitationReferences(markdown, rel, slugSets));
  }
  return errors;
}

/**
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function validateHowToQuestionHeadings(repoRoot) {
  const questionsPath = path.join(repoRoot, "docs/how-to-questions.md");
  const markdown = fs.readFileSync(questionsPath, "utf8");
  const errors = [];
  const found = new Set();
  for (const line of markdown.split("\n")) {
    const match = line.match(/^## (.+)$/);
    if (match) {
      found.add(match[1].trim());
    }
  }
  for (const heading of HOW_TO_QUESTION_HEADINGS) {
    if (!found.has(heading)) {
      errors.push(`docs/how-to-questions.md missing heading: ${heading}`);
    }
  }
  if (found.size !== HOW_TO_QUESTION_HEADINGS.length) {
    errors.push(
      `docs/how-to-questions.md expected ${HOW_TO_QUESTION_HEADINGS.length} question headings, found ${found.size}`,
    );
  }
  return errors;
}

export { assertHowToManualBundleFresh, ALLOWED_MANUAL_FILES, CITATION_SOURCES };
