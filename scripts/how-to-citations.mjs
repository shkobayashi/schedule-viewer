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
    for (const { file, fragment } of extractFileHeadingCitations(markdown)) {
      const err = validateCitation(file, fragment, slugSets);
      if (err) {
        errors.push(`${rel}: ${err}`);
      }
    }
  }
  return errors;
}

export { assertHowToManualBundleFresh, ALLOWED_MANUAL_FILES, CITATION_SOURCES };
