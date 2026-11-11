/**
 * Issue #553 items 2+8: quality-limit doc pointers and recurrence guidance.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

/** @param {string} packageJsonText */
function extractMaxWarnings(packageJsonText) {
  const pkg = JSON.parse(packageJsonText);
  const lint = pkg.scripts?.lint ?? "";
  const m = lint.match(/--max-warnings\s+(\d+)/);
  assert.ok(m, "package.json lint must have --max-warnings");
  return m[1];
}

/** @param {string} scriptText */
function extractJscpdThreshold(scriptText) {
  const m = scriptText.match(/--threshold[\s\S]*?"(\d+)"/);
  assert.ok(m, "check-architecture-warn.mjs must have --threshold");
  return m[1];
}

/** @param {string} vitestText */
function extractCoverageThresholds(vitestText) {
  const threshSection = vitestText.match(/thresholds:\s*\{([\s\S]*?)\n\s*\},/);
  assert.ok(threshSection, "vitest coverage.thresholds");
  return [...threshSection[1].matchAll(/:\s*(\d+)/g)].map((x) => x[1]);
}

/** @param {string} devMd */
function developmentQualityTableCells(devMd) {
  const keys = [
    "npm run lint",
    "npm run check:architecture-warn",
    "npm run test:coverage",
  ];
  return keys.map((key) => {
    const prefix = `| \`${key}\` |`;
    const line = devMd.split("\n").find((l) => l.startsWith(prefix));
    assert.ok(line, `development.md row for ${key}`);
    const parts = line.split("|");
    assert.equal(parts.length >= 3, true);
    return parts[2].trim();
  });
}

/** @param {string} devMd */
function developmentThresholdProse(devMd) {
  const start = devMd.indexOf("カバレッジの閾値は、テストを足した");
  const end = devMd.indexOf("\n\nRust のカバレッジ閾値は置かない");
  assert.ok(start >= 0 && end > start, "development.md threshold policy prose");
  return devMd.slice(start, end);
}

/**
 * True when a limit is copied as its own numeric token (not a substring such as 436 containing 6).
 * @param {string} text
 * @param {string} limit digits only
 */
export function textCopiesMutableLimitToken(text, limit) {
  const bare = new RegExp(`(?<![0-9])${limit}(?![0-9])`);
  if (bare.test(text)) return true;
  if (new RegExp(`(?<![0-9])${limit}%`).test(text)) return true;
  if (new RegExp(`(?<![0-9])${limit}\\s*件`).test(text)) return true;
  return false;
}

/**
 * @param {string} text
 * @param {string[]} limits
 */
export function assertNoCopiedLimits(text, limits) {
  for (const n of limits) {
    assert.ok(
      !textCopiesMutableLimitToken(text, n),
      `must not copy limit ${n} as token in: ${text.slice(0, 120)}`,
    );
  }
}

/** @param {string} text */
function assertRecurrenceCheckFirst(text, { forbidProseOnly = true } = {}) {
  assert.match(text, /検査.*先に足/);
  assert.match(text, /(足りない|止められない|だけ)/);
  if (forbidProseOnly) {
    assert.doesNotMatch(text, /再発を防ぐ検査または該当する節/);
    assert.doesNotMatch(text, /手順を該当スキルへ同じ変更で必ず足す/);
    assert.doesNotMatch(text, /再発防止の手順は implement-change へ同じ変更で足す/);
  }
}

test("development quality table links sources and omits mutable limits", () => {
  const devMd = readRepo("docs/development.md");
  const limits = [
    extractMaxWarnings(readRepo("package.json")),
    extractJscpdThreshold(readRepo("scripts/check-architecture-warn.mjs")),
    ...extractCoverageThresholds(readRepo("vitest.config.ts")),
  ];

  const [lintCell, jscpdCell, coverageCell] = developmentQualityTableCells(devMd);
  assert.match(lintCell, /package\.json/);
  assert.match(lintCell, /max-warnings/);
  assert.match(jscpdCell, /check-architecture-warn\.mjs/);
  assert.match(jscpdCell, /threshold/);
  assert.match(jscpdCell, /終了コードは 0|警告のまま/);
  assert.match(coverageCell, /vitest\.config\.ts/);
  assert.match(coverageCell, /coverage\.thresholds/);

  for (const cell of [lintCell, jscpdCell, coverageCell]) {
    assertNoCopiedLimits(cell, limits);
  }

  const prose = developmentThresholdProse(devMd);
  assert.match(prose, /vitest\.config\.ts/);
  assert.match(prose, /package\.json/);
  assert.match(prose, /check-architecture-warn\.mjs/);
  assert.match(prose, /約 1 ポイント/);
  assert.match(prose, /pull request に書く/);
  assert.doesNotMatch(prose, /表.*数値.*同じ変更/);
  assertNoCopiedLimits(prose, limits);
});

test("copied limit guard tolerates Issue #436 in scoped jscpd cell", () => {
  const threshold = extractJscpdThreshold(readRepo("scripts/check-architecture-warn.mjs"));
  const limits = [threshold];

  const jscpdCell = readRepo("docs/development.md");
  const [, cell] = developmentQualityTableCells(jscpdCell);
  assert.match(cell, /check-architecture-warn\.mjs/);
  assertNoCopiedLimits(cell, limits);

  const fixture =
    "jscpd。統合ブランチ feature-436（Issue #436）。上限は scripts/check-architecture-warn.mjs の --threshold";
  assertNoCopiedLimits(fixture, limits);
  assert.throws(
    () => assertNoCopiedLimits(`重複率の上限は ${threshold}% である`, limits),
    /must not copy limit/,
  );
});

test("agent-facing quality pointers reference config sources", () => {
  const agents = readRepo("AGENTS.md");
  assert.match(agents, /vitest\.config\.ts/);
  assert.match(agents, /check-architecture-warn\.mjs/);

  const index = readRepo("docs/agents-agent-index.md");
  assert.match(index, /check-architecture-warn\.mjs/);
  assert.match(index, /vitest\.config\.ts/);

  const internal = readRepo("docs/internal-spec.md");
  assert.match(internal, /vitest\.config\.ts/);
  assert.match(internal, /check-architecture-warn\.mjs/);

  const testSpec = readRepo("docs/test-spec.md");
  assert.match(testSpec, /vitest\.config\.ts/);
  assert.match(testSpec, /check-architecture-warn\.mjs/);
  const lintRow = testSpec.split("\n").find((l) => l.includes("npm run lint") && l.includes("ESLint"));
  assert.ok(lintRow, "test-spec ESLint row");
  assert.match(lintRow, /package\.json/);
  assert.match(lintRow, /max-warnings/);
  assert.doesNotMatch(lintRow, /development\.md.*max-warnings/);

  const archRow = testSpec.split("\n").find((l) => l.includes("check:architecture-warn"));
  assert.ok(archRow, "test-spec architecture-warn row");
  assert.match(archRow, /失敗にしない|警告/);
  assert.doesNotMatch(archRow, /(?<![0-9])6%/);

  const ci = readRepo(".github/workflows/ci.yml");
  assert.match(ci, /always exits 0/);
  assert.match(ci, /check-architecture-warn\.mjs.*threshold/);
  assert.doesNotMatch(ci, /threshold.*\d+%/);
});

test("recurrence instructions require checks before skill prose in four sources", () => {
  const skill = readRepo(".cursor/skills/implement-change/SKILL.md");
  const block = skill.match(/\*\*再発防止:\*\*([\s\S]*?)\n\n\| 節/)?.[1] ?? "";
  assertRecurrenceCheckFirst(block);

  const completion = skill.match(/## 完了条件[\s\S]*/)?.[0] ?? "";
  assertRecurrenceCheckFirst(completion);
  assert.match(completion, /検査（テスト・lint・スキーマ・既存 check）を先に足す/);

  const agents = readRepo("AGENTS.md");
  const agentsIncident = agents.match(/\*\*新しい事故\*\*[\s\S]*?。\n/)?.[0] ?? "";
  assertRecurrenceCheckFirst(agentsIncident);
  assert.match(agentsIncident, /テスト・lint・スキーマ検査・既存 check/);

  const pitfall = readRepo("docs/agents-pitfall-examples.md");
  const step2 = pitfall.match(/^2\.[\s\S]*?$/m)?.[0] ?? "";
  assertRecurrenceCheckFirst(step2);

  const review = readRepo(".cursor/skills/review-implementation/SKILL.md");
  assert.match(review, /再発を防ぐ検査（テスト・lint・スキーマ・既存 check）を先に足す/);

  const reviewProject = readRepo(".cursor/skills/review-project/SKILL.md");
  const rpDone = reviewProject.match(/## 完了条件[\s\S]*/)?.[0] ?? "";
  assertRecurrenceCheckFirst(rpDone);
  assert.match(rpDone, /再発を防ぐ検査を先に足したか/);

  const index = readRepo("docs/agents-agent-index.md");
  assert.match(index, /検査を先に足し/);
  assert.match(index, /足りないときだけ/);
});

test("recurrence mutation fixtures reject prose-only regressions", () => {
  const badImplementDone =
    "- レビューで計画と仕上がりがずれた箇所を直したときは、再発を防ぐ検査または該当する節へ同じ変更で必ず足す。";
  assert.throws(() => assertRecurrenceCheckFirst(badImplementDone), assert.AssertionError);

  const badAgents =
    "再発防止の手順は implement-change へ同じ変更で足す";
  assert.throws(() => assertRecurrenceCheckFirst(badAgents), assert.AssertionError);

  const badReviewProject =
    "再発を防ぐ手順を該当スキルへ同じ変更で必ず足したか";
  assert.throws(() => assertRecurrenceCheckFirst(badReviewProject), assert.AssertionError);

  const badDevPolicy = `カバレッジの閾値は 80 である。表と vitest.config.ts の両方を同じ変更で直す。`;
  assert.throws(
    () => assertNoCopiedLimits(badDevPolicy, ["80"]),
    /must not copy limit/,
  );
  assert.match(badDevPolicy, /表と vitest/);

  const badJscpdRow = "| check:architecture-warn | 上限 6% を超えると CI が失敗する |";
  assert.throws(() => assertNoCopiedLimits(badJscpdRow, ["6"]), /must not copy limit/);
  assert.match(badJscpdRow, /CI が失敗/);
});
