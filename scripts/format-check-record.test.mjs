import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  collectMetrics,
  formatExecutionRecord,
  parseCoverageLinesPercent,
  parseJscpdDuplicatedLinesPercent,
  parseLintWarningCount,
  parseMadgeCycleCount,
  shaIdentityStatus,
  usableForGuidelineFromRun,
  validatePhaseLogFile,
  validatePhaseLogStructure,
} from "./format-check-record.mjs";

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/format-check-record",
);

function readFixture(name) {
  const raw = fs.readFileSync(path.join(FIXTURES, name), "utf8");
  return raw.replace(/^# SYNTHETIC FIXTURE[^\n]*\n/, "");
}

const SHA_A = "693fff1d57c4f1ce6180dd3772fce997f0d392bb";
const SHA_B = "798f4761693d6a38bb164b85859be98f0238fae7";

test("shaIdentity valid when full SHAs match", () => {
  const record = formatExecutionRecord({
    sha: SHA_A,
    currentSha: SHA_A,
    results: [
      { cmd: "npm run lint", exit: 0, stdout: readFixture("eslint-synthetic.txt") },
    ],
  });
  assert.equal(record.shaIdentity.status, "valid");
  assert.equal(record.shaIdentity.usableForGuideline, true);
});

test("shaIdentity stale when full SHAs differ", () => {
  const record = formatExecutionRecord({
    sha: SHA_A,
    currentSha: SHA_B,
    results: [],
  });
  assert.equal(record.shaIdentity.status, "stale");
  assert.equal(record.shaIdentity.usableForGuideline, false);
  assert.equal(record.metrics.lintWarnings, "unknown");
});

test("shaIdentity invalid when SHA missing or malformed", () => {
  for (const input of [
    { sha: "short", currentSha: SHA_A },
    { sha: SHA_A, currentSha: "" },
    { sha: "not-a-sha", currentSha: "also-bad" },
  ]) {
    const record = formatExecutionRecord({ ...input, results: [] });
    assert.equal(record.shaIdentity.status, "invalid");
    assert.equal(record.shaIdentity.usableForGuideline, false);
  }
});

test("missing command output yields unknown metrics not zero", () => {
  const record = formatExecutionRecord({
    sha: SHA_A,
    currentSha: SHA_A,
    results: [{ cmd: "npm run lint", exit: 0, stdout: "", stderr: "" }],
  });
  assert.equal(record.metrics.lintWarnings, "unknown");
  assert.equal(record.metrics.coverageLinesPercent, "unknown");
  assert.equal(record.metrics.jscpdDuplicatedLinesPercent, "unknown");
  assert.equal(record.metrics.madgeCycleCount, "unknown");
});

test("parseLintWarningCount from synthetic eslint fixture", () => {
  const n = parseLintWarningCount(readFixture("eslint-synthetic.txt"));
  assert.equal(n, 12);
});

test("parseCoverageLinesPercent from synthetic vitest text-summary fixture", () => {
  const n = parseCoverageLinesPercent(readFixture("vitest-coverage-synthetic.txt"));
  assert.equal(n, 81.45);
});

test("parseCoverageLinesPercent prefers global summary over scoped threshold errors", () => {
  const n = parseCoverageLinesPercent(readFixture("vitest-coverage-glob-conflict-synthetic.txt"));
  assert.equal(n, 70);
});

test("parseMadgeCycleCount from synthetic madge OK fixture", () => {
  const n = parseMadgeCycleCount(readFixture("madge-ok-synthetic.txt"));
  assert.equal(n, 0);
});

test("parseJscpdDuplicatedLinesPercent from synthetic jscpd ERROR over threshold", () => {
  const n = parseJscpdDuplicatedLinesPercent(
    readFixture("jscpd-error-over-threshold-synthetic.txt"),
  );
  assert.equal(n, 5.18);
});

test("parseJscpdDuplicatedLinesPercent silent under threshold stays unknown", () => {
  const n = parseJscpdDuplicatedLinesPercent(
    readFixture("jscpd-silent-under-threshold-synthetic.txt"),
  );
  assert.equal(n, "unknown");
});

test("parseJscpdDuplicatedLinesPercent from synthetic jscpd total row", () => {
  const n = parseJscpdDuplicatedLinesPercent(readFixture("jscpd-total-synthetic.txt"));
  assert.equal(n, 5.27);
});

test("collectMetrics maps synthetic fixtures to command rows", () => {
  const metrics = collectMetrics([
    {
      cmd: "npm run lint",
      exit: 0,
      stdout: readFixture("eslint-synthetic.txt"),
    },
    {
      cmd: "npm run test:ci",
      exit: 0,
      stdout: readFixture("vitest-coverage-synthetic.txt"),
    },
    {
      cmd: "npm run check:madge-circular-baseline",
      exit: 0,
      stdout: readFixture("madge-ok-synthetic.txt"),
    },
    {
      cmd: "npm run check:architecture-warn",
      exit: 0,
      stdout: readFixture("jscpd-silent-under-threshold-synthetic.txt"),
    },
  ]);
  assert.equal(metrics.lintWarnings, 12);
  assert.equal(metrics.coverageLinesPercent, 81.45);
  assert.equal(metrics.madgeCycleCount, 0);
  assert.equal(metrics.jscpdDuplicatedLinesPercent, "unknown");
});

test("nonzero command exit marks failed aggregate status", () => {
  const record = formatExecutionRecord({
    sha: SHA_A,
    currentSha: SHA_A,
    results: [
      { cmd: "npm run lint", exit: 0, stdout: readFixture("eslint-synthetic.txt") },
      { cmd: "npm run test:ci", exit: 1, stdout: "" },
    ],
  });
  assert.equal(record.commands[1].status, "failed");
  assert.equal(record.aggregateCommandStatus, "failed");
  assert.equal(record.shaIdentity.status, "valid");
  assert.equal(record.shaIdentity.usableForGuideline, false);
});

test("failed or missing command exit makes usableForGuideline false despite valid sha", () => {
  const missingExit = formatExecutionRecord({
    sha: SHA_A,
    currentSha: SHA_A,
    results: [{ cmd: "npm run lint", stdout: "ok" }],
  });
  assert.equal(missingExit.commands[0].status, "unknown");
  assert.equal(missingExit.aggregateCommandStatus, "unknown");
  assert.equal(missingExit.shaIdentity.usableForGuideline, false);

  const noCommands = formatExecutionRecord({
    sha: SHA_A,
    currentSha: SHA_A,
    results: [],
  });
  assert.equal(noCommands.shaIdentity.status, "valid");
  assert.equal(noCommands.shaIdentity.usableForGuideline, false);
});

test("durationMs provenance is provided only when caller supplied a number", () => {
  const withDur = formatExecutionRecord({
    sha: SHA_A,
    currentSha: SHA_A,
    durationMs: 42_000,
    results: [],
  });
  assert.equal(withDur.durationMs.value, 42_000);
  assert.equal(withDur.durationMs.provenance, "provided");
  const without = formatExecutionRecord({ sha: SHA_A, currentSha: SHA_A, results: [] });
  assert.equal(without.durationMs.value, "unknown");
  assert.equal(without.durationMs.provenance, "unknown");
});

test("record limits state shaIdentity is not execution proof", () => {
  const record = formatExecutionRecord({
    sha: SHA_A,
    currentSha: SHA_A,
    results: [{ cmd: "npm run lint", exit: 0, stdout: "" }],
  });
  assert.ok(
    record.limits.some((line) => line.includes("not proof these commands ran")),
  );
  assert.equal(record.provenance, "provided");
});

test("phase log migration preserves #551 and #475 structured history", () => {
  const result = validatePhaseLogFile();
  assert.equal(result.ok, true, result.issues.join("; "));
});

test("phase log validator allows future numeric token fields", () => {
  const sample = `
## Issue #551
verified_head_sha: \`693fff1d57c4f1ce6180dd3772fce997f0d392bb\`
### phase-history
merge_summary:
  git_size: "31 テキストファイル +2796 / −53、34 バイナリ"
  review_findings: unknown
  fix_rounds: unknown
effort: unknown
tokens: 120000
${"計画の軽い見直しは、別の Cloud Agent セッションとして残らないインライン確認であり、索引に無いことだけをもって省略したとは書かない"}
## Issue #475
verified_head_sha: \`798f4761693d6a38bb164b85859be98f0238fae7\`
### phase-history
merge_summary:
  git_size: "26 テキストファイル +1922 / −33、8 バイナリ"
  文書の食い違い 5 件
  fix_rounds: unknown
  effort: high
  source: coordinator launch record
`;
  assert.equal(validatePhaseLogStructure(sample).ok, true);
});

test("shaIdentityStatus unit cases", () => {
  assert.deepEqual(shaIdentityStatus(SHA_A, SHA_A, true, true), {
    status: "valid",
    usableForGuideline: false,
  });
  assert.deepEqual(shaIdentityStatus(SHA_A, SHA_B, true, true), {
    status: "stale",
    usableForGuideline: false,
  });
  assert.deepEqual(shaIdentityStatus(null, SHA_A, false, true), {
    status: "invalid",
    usableForGuideline: false,
  });
  assert.equal(usableForGuidelineFromRun("valid", "passed"), true);
  assert.equal(usableForGuidelineFromRun("valid", "failed"), false);
  assert.equal(usableForGuidelineFromRun("valid", "unknown"), false);
});
