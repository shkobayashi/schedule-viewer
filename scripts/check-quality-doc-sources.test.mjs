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
 * @param {string} text
 * @param {string[]} limits
 */
function assertNoCopiedLimits(text, limits) {
  for (const n of limits) {
    assert.ok(!text.includes(n), `must not copy limit ${n}`);
    assert.ok(!text.includes(`${n}%`), `must not copy limit ${n}%`);
    assert.ok(!text.includes(`${n} 件`), `must not copy limit ${n} 件`);
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
  assertNoCopiedLimits(prose, limits);
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
});

test("recurrence guidance prefers automated checks before skill prose", () => {
  const skill = readRepo(".cursor/skills/implement-change/SKILL.md");
  const block = skill.match(/\*\*再発防止:\*\*([\s\S]*?)\n\n\| 節/)?.[1] ?? "";
  assert.match(block, /検査を先に足す/);
  assert.match(block, /その検査では止められない/);
  assert.match(block, /検査だけで足りる/);

  const review = readRepo(".cursor/skills/review-implementation/SKILL.md");
  assert.match(review, /再発を防ぐ検査（テスト・lint・スキーマ・既存 check）を先に足す/);

  const index = readRepo("docs/agents-agent-index.md");
  assert.match(index, /検査を先に足し/);
  assert.match(index, /足りないときだけ/);
});
