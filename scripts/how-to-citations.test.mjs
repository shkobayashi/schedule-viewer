import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  assertHowToManualBundleFresh,
  HOW_TO_MANUAL_PAGES,
  buildHowToManualFromSources,
} from "./how-to-manual-bundle.mjs";
import {
  extractFileHeadingCitations,
  manualSlugSetsFromBundle,
  validateCitation,
  validateDeclaredCitations,
} from "./how-to-citations.mjs";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

test("how-to manual bundle matches stripped sources and exact six files", () => {
  const errors = assertHowToManualBundleFresh(repoRoot);
  assert.deepEqual(
    errors,
    [],
    errors.length ? errors.join("\n") : undefined,
  );
  const manualDir = path.join(repoRoot, ".cursor/skills/how-to/manual");
  const files = fs
    .readdirSync(manualDir)
    .filter((n) => fs.statSync(path.join(manualDir, n)).isFile())
    .sort();
  assert.deepEqual(
    files,
    HOW_TO_MANUAL_PAGES.map((p) => p.out).sort(),
  );
});

test("strip removes image tokens from features sample", () => {
  const expected = buildHowToManualFromSources(repoRoot).get("features.md");
  assert.ok(expected);
  assert.doesNotMatch(expected, /!\[/);
});

test("declared citations in SKILL and questions use known manual slugs", () => {
  const errors = validateDeclaredCitations(repoRoot);
  assert.deepEqual(errors, [], errors.join("\n"));
});

test("features.md#設定 is a valid citation", () => {
  const slugSets = manualSlugSetsFromBundle(repoRoot);
  assert.equal(validateCitation("features.md", "設定", slugSets), null);
});

test("features.md#この見出しは無い is rejected", () => {
  const slugSets = manualSlugSetsFromBundle(repoRoot);
  const err = validateCitation("features.md", "この見出しは無い", slugSets);
  assert.ok(err?.includes("features.md"));
  assert.ok(err?.includes("この見出しは無い"));
});

test("features.md heading ファイルを開く・保存する uses slug ファイルを開く保存する", () => {
  const slugSets = manualSlugSetsFromBundle(repoRoot);
  assert.ok(
    validateCitation("features.md", "ファイルを開く・保存する", slugSets),
  );
  assert.equal(
    validateCitation("features.md", "ファイルを開く保存する", slugSets),
    null,
  );
});

test("extractFileHeadingCitations finds citations in markdown", () => {
  const sample = "参照は features.md#設定 と tutorial.md#チュートリアル です。";
  const cites = extractFileHeadingCitations(sample);
  assert.equal(cites.length, 2);
  assert.deepEqual(cites[0], { file: "features.md", fragment: "設定" });
});
