import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  assertHowToManualBundleFresh,
  assertHowToManualBundleState,
  HOW_TO_MANUAL_PAGES,
  buildHowToManualFromSources,
  stripMarkdownImages,
} from "./how-to-manual-bundle.mjs";
import {
  extractFileHeadingCitations,
  extractAllFileHeadingCitations,
  manualSlugSetsFromBundle,
  validateCitation,
  validateCitationReferences,
  validateDeclaredCitations,
  validateHowToQuestionHeadings,
  HOW_TO_QUESTION_HEADINGS,
} from "./how-to-citations.mjs";
import { buildSlugSet } from "./build-user-manual-site.mjs";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function tempRepoRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "how-to-bundle-"));
}

function writeMinimalSourceTree(root) {
  for (const page of HOW_TO_MANUAL_PAGES) {
    const target = path.join(root, page.source);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `# ${page.out}\n\nbody for ${page.out}\n`);
  }
}

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

test("assertHowToManualBundleState rejects missing file", () => {
  const root = tempRepoRoot();
  writeMinimalSourceTree(root);
  const expected = buildHowToManualFromSources(root);
  const manualDir = path.join(root, ".cursor/skills/how-to/manual");
  fs.mkdirSync(manualDir, { recursive: true });
  for (const [out, content] of expected) {
    if (out === "privacy.md") {
      continue;
    }
    fs.writeFileSync(path.join(manualDir, out), content);
  }
  const errors = assertHowToManualBundleState(manualDir, expected);
  assert.ok(errors.some((e) => e.includes("missing bundled file manual/privacy.md")));
});

test("assertHowToManualBundleState rejects extra file", () => {
  const root = tempRepoRoot();
  writeMinimalSourceTree(root);
  const expected = buildHowToManualFromSources(root);
  const manualDir = path.join(root, ".cursor/skills/how-to/manual");
  fs.mkdirSync(manualDir, { recursive: true });
  for (const [out, content] of expected) {
    fs.writeFileSync(path.join(manualDir, out), content);
  }
  fs.writeFileSync(path.join(manualDir, "extra.md"), "x");
  const errors = assertHowToManualBundleState(manualDir, expected);
  assert.ok(errors.some((e) => e.includes("unexpected bundled file manual/extra.md")));
});

test("assertHowToManualBundleState rejects extra directory", () => {
  const root = tempRepoRoot();
  writeMinimalSourceTree(root);
  const expected = buildHowToManualFromSources(root);
  const manualDir = path.join(root, ".cursor/skills/how-to/manual");
  fs.mkdirSync(path.join(manualDir, "images"), { recursive: true });
  for (const [out, content] of expected) {
    fs.writeFileSync(path.join(manualDir, out), content);
  }
  const errors = assertHowToManualBundleState(manualDir, expected);
  assert.ok(
    errors.some((e) => e.includes("unexpected bundled directory manual/images")),
  );
});

test("assertHowToManualBundleState rejects stale content", () => {
  const root = tempRepoRoot();
  writeMinimalSourceTree(root);
  const expected = buildHowToManualFromSources(root);
  const manualDir = path.join(root, ".cursor/skills/how-to/manual");
  fs.mkdirSync(manualDir, { recursive: true });
  for (const [out, content] of expected) {
    const stale = out === "tutorial.md" ? "old\n" : content;
    fs.writeFileSync(path.join(manualDir, out), stale);
  }
  const errors = assertHowToManualBundleState(manualDir, expected);
  assert.ok(errors.some((e) => e.includes("stale bundled file manual/tutorial.md")));
});

test("assertHowToManualBundleState rejects leftover image tokens", () => {
  const root = tempRepoRoot();
  writeMinimalSourceTree(root);
  const expected = buildHowToManualFromSources(root);
  const manualDir = path.join(root, ".cursor/skills/how-to/manual");
  fs.mkdirSync(manualDir, { recursive: true });
  for (const [out, content] of expected) {
    const body =
      out === "features.md" ? `${content}\n![alt](images/x.png)\n` : content;
    fs.writeFileSync(path.join(manualDir, out), body);
  }
  const errors = assertHowToManualBundleState(manualDir, expected);
  assert.ok(
    errors.some((e) => e.includes("image markdown left in manual/features.md")),
  );
});

test("strip removes image tokens from features sample", () => {
  const expected = buildHowToManualFromSources(repoRoot).get("features.md");
  assert.ok(expected);
  assert.doesNotMatch(expected, /!\[/);
  const stripped = stripMarkdownImages("text ![x](y.png) end");
  assert.equal(stripped, "text  end");
});

test("declared citations in SKILL and questions use known manual slugs", () => {
  const errors = validateDeclaredCitations(repoRoot);
  assert.deepEqual(errors, [], errors.join("\n"));
});

test("docs how-to-questions has eight fixed question headings", () => {
  const errors = validateHowToQuestionHeadings(repoRoot);
  assert.deepEqual(errors, [], errors.join("\n"));
  assert.equal(HOW_TO_QUESTION_HEADINGS.length, 8);
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

test("duplicate manual headings use github-slugger -1 suffix", () => {
  const markdown = "## 設定\n\n## 設定\n";
  const slugs = buildSlugSet(markdown);
  assert.ok(slugs.has("設定"));
  assert.ok(slugs.has("設定-1"));
  const slugSets = new Map([["features.md", slugs]]);
  assert.equal(validateCitation("features.md", "設定-1", slugSets), null);
});

test("slash-qualified citation manual/features.md#設定 is rejected", () => {
  const slugSets = manualSlugSetsFromBundle(repoRoot);
  const sample = "参照は manual/features.md#設定 です。";
  const errors = validateCitationReferences(sample, "test.md", slugSets);
  assert.ok(errors.some((e) => e.includes("slash-qualified")));
  assert.equal(extractFileHeadingCitations(sample).length, 0);
  assert.equal(extractAllFileHeadingCitations(sample).length, 1);
});

test("unknown file bogus.md#foo is rejected", () => {
  const slugSets = manualSlugSetsFromBundle(repoRoot);
  const errors = validateCitationReferences(
    "参照は bogus.md#foo です。",
    "test.md",
    slugSets,
  );
  assert.ok(errors.some((e) => e.includes("unknown file bogus.md")));
});

test("extractFileHeadingCitations finds citations in markdown", () => {
  const sample = "参照は features.md#設定 と tutorial.md#チュートリアル です。";
  const cites = extractFileHeadingCitations(sample);
  assert.equal(cites.length, 2);
  assert.deepEqual(cites[0], { file: "features.md", fragment: "設定" });
});
