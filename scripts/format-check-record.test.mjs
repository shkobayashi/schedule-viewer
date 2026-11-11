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
  validateCommittedPhaseRecordFiles,
  validateIssue475HistoricalPhases,
  validatePhaseLogFile,
  validatePhaseLogStructure,
  currentVerifiedHeadFromReviews,
  latestMergeReadyHeadSha,
  validatePhaseRecord,
  validatePhaseRecordRevision,
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

test("parseJscpdDuplicatedLinesPercent from synthetic jscpd silent detection line", () => {
  const n = parseJscpdDuplicatedLinesPercent(
    readFixture("jscpd-silent-under-threshold-synthetic.txt"),
  );
  assert.equal(n, 4.2);
});

test("parseJscpdDuplicatedLinesPercent without detection percent stays unknown", () => {
  const n = parseJscpdDuplicatedLinesPercent(readFixture("jscpd-silent-empty-synthetic.txt"));
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
  assert.equal(metrics.jscpdDuplicatedLinesPercent, 4.2);
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

const PHASE_LOG_CAVEAT_FOR_FIXTURE =
  "計画の軽い見直しは、別の Cloud Agent セッションとして残らないインライン確認であり、索引に無いことだけをもって省略したとは書かない";

const POSITIVE_475_YAML = `phases:
  - task_type: 計画
    model_id: grok-4.7
    effort: high
    source: coordinator launch record
  - task_type: 実装
    model_id: composer-2.5
    effort: unknown
  - task_type: レビュー
    model_id: grok-4.7
    effort: high
    source: coordinator review record
  - task_type: 修正
    model_id: composer-2.5
    effort: unknown
merge_summary:
  git_size: "26 テキストファイル +1922 / −33、8 バイナリ"
  review_findings: "文書の食い違い 5 件"
  fix_rounds: unknown
  tokens: 120000
  measured_on: 2026-03-02
`;

function minimalPhaseLogWith475Yaml(yamlBody) {
  return `
## Issue #551
verified_head_sha: \`693fff1d57c4f1ce6180dd3772fce997f0d392bb\`
### phase-history
merge_summary:
  git_size: "31 テキストファイル +2796 / −53、34 バイナリ"
  review_findings: unknown
  fix_rounds: unknown
effort: unknown
${PHASE_LOG_CAVEAT_FOR_FIXTURE}
## Issue #475
verified_head_sha: \`798f4761693d6a38bb164b85859be98f0238fae7\`
### phase-history
\`\`\`yaml
${yamlBody}
\`\`\`
`;
}

test("phase log validator allows future numeric token fields", () => {
  const sample = minimalPhaseLogWith475Yaml(POSITIVE_475_YAML);
  assert.equal(validatePhaseLogStructure(sample).ok, true);
});

test("phase log validator rejects #475 plan effort not high", () => {
  const yaml = POSITIVE_475_YAML.replace(
    /- task_type: 計画[\s\S]*?source: coordinator launch record/,
    `- task_type: 計画
    model_id: grok-4.7
    effort: unknown
    source: coordinator launch record`,
  );
  assert.equal(validateIssue475HistoricalPhases(yaml).ok, false);
});

test("phase log validator rejects #475 review effort not high", () => {
  const yaml = POSITIVE_475_YAML.replace(
    /- task_type: レビュー[\s\S]*?source: coordinator review record/,
    `- task_type: レビュー
    model_id: grok-4.7
    effort: unknown
    source: coordinator review record`,
  );
  assert.equal(validateIssue475HistoricalPhases(yaml).ok, false);
});

test("phase log validator rejects #475 implement effort not unknown", () => {
  const yaml = POSITIVE_475_YAML.replace(
    /- task_type: 実装[\s\S]*?effort: unknown/,
    `- task_type: 実装
    model_id: composer-2.5
    effort: medium`,
  );
  assert.equal(validateIssue475HistoricalPhases(yaml).ok, false);
});

test("phase log validator rejects #475 fix composer effort not unknown", () => {
  const yaml = POSITIVE_475_YAML.replace(
    /- task_type: 修正[\s\S]*?effort: unknown/,
    `- task_type: 修正
    model_id: composer-2.5
    effort: medium`,
  );
  assert.equal(validateIssue475HistoricalPhases(yaml).ok, false);
});

test("phase log validator rejects fabricated old table March migration phrase", () => {
  const sample = `${minimalPhaseLogWith475Yaml(POSITIVE_475_YAML)}
移行元は旧一行表（2026-03 以前）
`;
  assert.equal(validatePhaseLogStructure(sample).ok, false);
});

test("validatePhaseRecord rejects high effort without effort_basis", () => {
  const bad = validatePhaseRecord({
    record_id: "t",
    provenance: "test",
    fix_rounds: 0,
    phases: [
      {
        id: "p1",
        task_type: "計画",
        effort: "high",
        effort_basis: "unknown",
        provenance: "test",
      },
    ],
    corrections: [],
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.issues.some((i) => i.includes("effort_basis")));
});

test("validatePhaseRecord accepts configured high plan with effort_basis configured", () => {
  const good = validatePhaseRecord({
    record_id: "t",
    provenance: "test",
    fix_rounds: 0,
    phases: [
      {
        id: "p1",
        task_type: "計画",
        effort: "high",
        effort_basis: "configured",
        session_id: "bc-730af328-eac8-54ff-ad46-aef8345f8a92",
        provenance: "test",
      },
    ],
    corrections: [],
  });
  assert.equal(good.ok, true, good.issues.join("; "));
});

test("validatePhaseRecord rejects fix_rounds mismatch", () => {
  const bad = validatePhaseRecord({
    record_id: "t",
    provenance: "test",
    fix_rounds: 2,
    phases: [
      {
        id: "f1",
        task_type: "修正",
        substantive_fix: true,
        provenance: "test",
      },
    ],
    corrections: [],
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.issues.some((i) => i.includes("fix_rounds")));
});

test("validatePhaseRecordRevision rejects dropped earlier phase", () => {
  const prev = {
    record_id: "t",
    provenance: "test",
    fix_rounds: 0,
    phases: [
      {
        id: "a",
        task_type: "計画",
        effort: "unknown",
        effort_basis: "unknown",
        provenance: "test",
      },
    ],
    corrections: [],
  };
  const next = {
    record_id: "t",
    provenance: "test",
    fix_rounds: 0,
    phases: [
      {
        id: "b",
        task_type: "実装",
        effort: "unknown",
        effort_basis: "unknown",
        provenance: "test",
      },
    ],
    corrections: [],
  };
  const rev = validatePhaseRecordRevision(prev, next);
  assert.equal(rev.ok, false);
  assert.ok(
    rev.issues.some(
      (i) => i.includes("dropped phase") || i.includes("mutated phase at index 0"),
    ),
  );
});

test("validatePhaseRecordRevision allows appended correction and integration status change", () => {
  const committed = validateCommittedPhaseRecordFiles();
  assert.equal(committed.ok, true, committed.issues.join("; "));
  const rec591 = committed.records.find(
    (r) => r && typeof r === "object" && r.record_id === "issue-553-pr-591",
  );
  assert.ok(rec591);
  const revised = structuredClone(rec591);
  revised.integration_status = {
    ...revised.integration_status,
    pr_state: "merged",
    as_of: "2026-12-01",
  };
  revised.corrections = [
    ...revised.corrections,
    {
      id: "591-corr-status-2",
      appended_at: "2026-12-01",
      correction_note: "PR merged; prior open row kept in history via revision append.",
      provenance: "coordinator correction",
    },
  ];
  const rev = validatePhaseRecordRevision(rec591, revised);
  assert.equal(rev.ok, true, rev.issues.join("; "));
  assert.equal(validatePhaseRecord(revised).ok, true);
});

test("#591 record uses as-of integration_status without validator pinning open forever", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = /** @type {{ integration_status?: { pr_state?: string } }} */ (
    committed.records.find((r) => r?.record_id === "issue-553-pr-591")
  );
  assert.ok(rec591?.integration_status?.pr_state);
  assert.equal(validatePhaseRecord(rec591).ok, true);
});

test("#591 committed record reflects GitHub user merge and keeps verified_head_sha", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  assert.ok(rec591);
  assert.equal(rec591.integration_status.pr_state, "merged");
  assert.equal(
    rec591.integration_status.merge_commit_sha,
    "4382d4b7eb53e0601ceacd7e508e99c61dee994a",
  );
  assert.equal(rec591.verified_head_sha, "2add60baa4014c3900cca4f5a77ae73d00aaae1d");
  assert.equal(rec591.fix_rounds, 2);
  const userMerge = rec591.phases.find((p) => p.id === "591-merge-user-1");
  assert.ok(userMerge);
  assert.equal(userMerge.substantive_fix, false);
});

test("validatePhaseRecordRevision accepts #591 user merge phase and merged integration_status", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  assert.ok(rec591);
  const beforeMerge = structuredClone(rec591);
  beforeMerge.integration_status = {
    as_of: "2026-11-11",
    pr_state: "open",
    pr_head_sha: "2add60baa4014c3900cca4f5a77ae73d00aaae1d",
    provenance: "coordinator launch/review/fix record and GitHub fetch at slice authoring",
  };
  beforeMerge.phases = beforeMerge.phases.filter((p) => p.id !== "591-merge-user-1");
  beforeMerge.corrections = beforeMerge.corrections.filter(
    (c) =>
      c.id !== "591-corr-integration-open-historical" && c.id !== "591-corr-user-merge-github",
  );
  const rev = validatePhaseRecordRevision(beforeMerge, rec591);
  assert.equal(rev.ok, true, rev.issues.join("; "));
  assert.equal(validatePhaseRecord(rec591).ok, true);
});

test("committed #592 canonical record matches high plan configured and fix_rounds 1", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec592 = committed.records.find((r) => r?.record_id === "issue-553-pr-592");
  assert.ok(rec592);
  assert.equal(rec592.fix_rounds, 1);
  const plan = rec592.phases.find((p) => p.id === "592-plan-1");
  assert.equal(plan.effort_basis, "configured");
  assert.equal(rec592.verified_head_sha, "eb0c804e42a6c1359920da7b202f103124dcbb0a");
});

test("#591 committed record verified_head_sha matches latest MERGE-READY review", () => {
  const committed = validateCommittedPhaseRecordFiles();
  assert.equal(committed.ok, true, committed.issues.join("; "));
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  assert.ok(rec591);
  assert.equal(
    currentVerifiedHeadFromReviews(rec591.phases),
    "2add60baa4014c3900cca4f5a77ae73d00aaae1d",
  );
  assert.equal(rec591.verified_head_sha, "2add60baa4014c3900cca4f5a77ae73d00aaae1d");
  assert.equal(rec591.integration_status.pr_state, "merged");
  assert.equal(rec591.ready_head_sha, "60d5252149558ddf0146866f0cd2f60995ee03e4");
});

test("validatePhaseRecord rejects verified_head_sha missing when MERGE-READY review exists", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  assert.ok(rec591);
  const broken = structuredClone(rec591);
  broken.verified_head_sha = null;
  const check = validatePhaseRecord(broken);
  assert.equal(check.ok, false);
  assert.ok(check.issues.some((i) => i.includes("verified_head_sha required")));
});

test("validatePhaseRecordRevision rejects mutated committed #591 phase prefix", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  assert.ok(rec591);
  const mutated = structuredClone(rec591);
  mutated.phases[0].effort = "medium";
  const rev = validatePhaseRecordRevision(rec591, mutated);
  assert.equal(rev.ok, false);
  assert.ok(rev.issues.some((i) => i.includes("mutated phase at index 0")));
});

test("validatePhaseRecordRevision rejects replaced committed #591 correction prefix", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  assert.ok(rec591);
  const mutated = structuredClone(rec591);
  mutated.corrections[0].correction_note = "replaced text";
  const rev = validatePhaseRecordRevision(rec591, mutated);
  assert.equal(rev.ok, false);
  assert.ok(rev.issues.some((i) => i.includes("mutated correction at index 0")));
});

test("validatePhaseRecordRevision rejects reordered committed #591 phases", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  assert.ok(rec591);
  const mutated = structuredClone(rec591);
  const [first, second] = mutated.phases;
  mutated.phases[0] = second;
  mutated.phases[1] = first;
  const rev = validatePhaseRecordRevision(rec591, mutated);
  assert.equal(rev.ok, false);
  assert.ok(rev.issues.some((i) => i.includes("mutated phase")));
});

test("validatePhaseRecordRevision rejects deleted committed #591 correction", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  assert.ok(rec591);
  const shortened = structuredClone(rec591);
  shortened.corrections = shortened.corrections.slice(0, -1);
  const rev = validatePhaseRecordRevision(rec591, shortened);
  assert.equal(rev.ok, false);
  assert.ok(rev.issues.some((i) => i.includes("removed correction")));
});

const REVIEW_HEAD_WITHDRAWN = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const REVIEW_HEAD_REREADY = "cccccccccccccccccccccccccccccccccccccccc";

test("validatePhaseRecord rejects stale verified_head_sha after appended NOT-READY review", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  assert.ok(rec591);
  const withdrawn = structuredClone(rec591);
  withdrawn.phases.push({
    id: "591-review-adverse-rereview",
    task_type: "レビュー",
    model_id: "grok-4.7",
    effort: "high",
    effort_basis: "configured",
    session_id: "bc-f2aab7f8-7be0-5eac-adea-5ed6f54baadf",
    review_outcome: "NOT-READY",
    head_sha_reviewed: REVIEW_HEAD_WITHDRAWN,
    findings: "Not ready; regressions on the integration head.",
    provenance: "coordinator review record",
  });
  assert.equal(currentVerifiedHeadFromReviews(withdrawn.phases), null);
  const check = validatePhaseRecord(withdrawn);
  assert.equal(check.ok, false);
  assert.ok(
    check.issues.some((i) => i.includes("verified_head_sha must be null")),
  );
});

test("validatePhaseRecord accepts null verified_head_sha after NOT-READY withdrawal", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  const withdrawn = structuredClone(rec591);
  withdrawn.phases.push({
    id: "591-review-adverse-rereview",
    task_type: "レビュー",
    model_id: "grok-4.7",
    effort: "high",
    effort_basis: "configured",
    session_id: "bc-f2aab7f8-7be0-5eac-adea-5ed6f54baadf",
    review_outcome: "NOT-READY",
    head_sha_reviewed: REVIEW_HEAD_WITHDRAWN,
    findings: "Not ready; regressions on the integration head.",
    provenance: "coordinator review record",
  });
  withdrawn.verified_head_sha = null;
  const check = validatePhaseRecord(withdrawn);
  assert.equal(check.ok, true, check.issues.join("; "));
  const r3 = withdrawn.phases.find((p) => p.id === "591-review-3");
  const r4 = withdrawn.phases.find((p) => p.id === "591-review-4");
  assert.equal(r3?.head_sha_reviewed, "60d5252149558ddf0146866f0cd2f60995ee03e4");
  assert.equal(r4?.review_outcome, "MERGE-READY");
});

test("validatePhaseRecord preserves verified_head when appended review has no readiness judgment", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  const noop = structuredClone(rec591);
  noop.phases.push({
    id: "591-review-notes-only",
    task_type: "レビュー",
    model_id: "grok-4.7",
    effort: "high",
    effort_basis: "configured",
    provenance: "coordinator review record",
    head_sha_reviewed: "2add60baa4014c3900cca4f5a77ae73d00aaae1d",
    findings: "Coverage notes only; no merge readiness stated.",
  });
  assert.equal(
    currentVerifiedHeadFromReviews(noop.phases),
    "2add60baa4014c3900cca4f5a77ae73d00aaae1d",
  );
  assert.equal(validatePhaseRecord(noop).ok, true, validatePhaseRecord(noop).issues.join("; "));
  assert.equal(validatePhaseRecordRevision(rec591, noop).ok, true);
});

test("validatePhaseRecord requires new head after MERGE-READY re-ready on later head", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  const reready = structuredClone(rec591);
  reready.phases.push(
    {
      id: "591-review-adverse-rereview",
      task_type: "レビュー",
      review_outcome: "NOT-READY",
      head_sha_reviewed: REVIEW_HEAD_WITHDRAWN,
      findings: "Not ready; regressions on the integration head.",
      provenance: "coordinator review record",
    },
    {
      id: "591-review-reready",
      task_type: "レビュー",
      review_outcome: "MERGE-READY",
      head_sha_reviewed: REVIEW_HEAD_REREADY,
      findings: "MERGE-READY after fix on new head.",
      provenance: "coordinator review record",
    },
  );
  assert.equal(currentVerifiedHeadFromReviews(reready.phases), REVIEW_HEAD_REREADY);
  reready.verified_head_sha = "2add60baa4014c3900cca4f5a77ae73d00aaae1d";
  assert.equal(validatePhaseRecord(reready).ok, false);
  reready.verified_head_sha = REVIEW_HEAD_REREADY;
  assert.equal(validatePhaseRecord(reready).ok, true);
});

test("validatePhaseRecord review_outcome NOT-READY overrides positive findings text", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  const contradictory = structuredClone(rec591);
  contradictory.phases.push({
    id: "591-review-outcome-wins",
    task_type: "レビュー",
    review_outcome: "NOT-READY",
    head_sha_reviewed: REVIEW_HEAD_WITHDRAWN,
    findings: "MERGE-READY prose contradiction must not apply.",
    provenance: "coordinator review record",
  });
  contradictory.verified_head_sha = null;
  assert.equal(currentVerifiedHeadFromReviews(contradictory.phases), null);
  assert.equal(validatePhaseRecord(contradictory).ok, true);
});

test("validatePhaseRecord rejects invalid review_outcome on review phase", () => {
  const bad = validatePhaseRecord({
    record_id: "t",
    provenance: "test",
    verified_head_sha: null,
    fix_rounds: 0,
    phases: [
      {
        id: "r1",
        task_type: "レビュー",
        review_outcome: "MAYBE",
        provenance: "test",
      },
    ],
    corrections: [],
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.issues.some((i) => i.includes("invalid review_outcome")));
});

function exampleRollupCorrection(id, key, value, provenance) {
  return {
    id,
    appended_at: "2026-11-11",
    provenance: provenance ?? "tool usage response (synthetic example)",
    correction_note: `Example observation: ${key} ${value}.`,
    rollup_observation: { key, value },
  };
}

test("validatePhaseRecord rejects uncited merge_summary tokens on committed #591 clone (example)", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  const inflated = structuredClone(rec591);
  inflated.merge_summary = { ...inflated.merge_summary, tokens: 99999 };
  const check = validatePhaseRecord(inflated);
  assert.equal(check.ok, false);
  assert.ok(check.issues.some((i) => i.includes("merge_summary.tokens")));
  const rev = validatePhaseRecordRevision(rec591, inflated);
  assert.equal(rev.ok, false);
});

test("validatePhaseRecord accepts cited merge_summary tokens with appended observation (example)", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  const cited = structuredClone(rec591);
  cited.merge_summary = { ...cited.merge_summary, tokens: 1200 };
  cited.corrections = [
    ...cited.corrections,
    exampleRollupCorrection("591-corr-tokens-1200-example", "tokens", 1200),
  ];
  const check = validatePhaseRecord(cited);
  assert.equal(check.ok, true, check.issues.join("; "));
  const rev = validatePhaseRecordRevision(rec591, cited);
  assert.equal(rev.ok, true, rev.issues.join("; "));
  assert.equal(cited.phases[0].id, rec591.phases[0].id);
});

test("validatePhaseRecordRevision rejects merge_summary token change without fresh observation (example)", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  const with1200 = structuredClone(rec591);
  with1200.merge_summary = { ...with1200.merge_summary, tokens: 1200 };
  with1200.corrections = [
    ...with1200.corrections,
    exampleRollupCorrection("591-corr-tokens-1200-example", "tokens", 1200),
  ];
  const bumped = structuredClone(with1200);
  bumped.merge_summary = { ...bumped.merge_summary, tokens: 1500 };
  const rev = validatePhaseRecordRevision(with1200, bumped);
  assert.equal(rev.ok, false);
  assert.ok(rev.issues.some((i) => i.includes("appended rollup_observation")));
});

test("validatePhaseRecord accepts merge_summary token change with fresh observation (example)", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  const with1200 = structuredClone(rec591);
  with1200.merge_summary = { ...with1200.merge_summary, tokens: 1200 };
  with1200.corrections = [
    ...with1200.corrections,
    exampleRollupCorrection("591-corr-tokens-1200-example", "tokens", 1200),
  ];
  const bumped = structuredClone(with1200);
  bumped.merge_summary = { ...bumped.merge_summary, tokens: 1500 };
  bumped.corrections = [
    ...bumped.corrections,
    exampleRollupCorrection("591-corr-tokens-1500-example", "tokens", 1500),
  ];
  assert.equal(validatePhaseRecordRevision(with1200, bumped).ok, true);
  assert.equal(validatePhaseRecord(bumped).ok, true);
});

test("validatePhaseRecord rejects rollup_observation without provenance (example)", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  const bad = structuredClone(rec591);
  bad.merge_summary = { ...bad.merge_summary, tokens: 1200 };
  bad.corrections = [
    ...bad.corrections,
    {
      id: "591-corr-no-prov",
      appended_at: "2026-11-11",
      provenance: "  ",
      rollup_observation: { key: "tokens", value: 1200 },
    },
  ];
  assert.equal(validatePhaseRecord(bad).ok, false);
});

test("validatePhaseRecord rejects rollup_observation key value mismatch (example)", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  const bad = structuredClone(rec591);
  bad.merge_summary = { ...bad.merge_summary, tokens: 1200 };
  bad.corrections = [
    ...bad.corrections,
    exampleRollupCorrection("591-corr-wrong-value", "tokens", 999),
  ];
  const check = validatePhaseRecord(bad);
  assert.equal(check.ok, false);
  assert.ok(check.issues.some((i) => i.includes("merge_summary.tokens")));
});

test("validatePhaseRecord rejects MERGE-READY without head_sha_reviewed on #591 clone (example)", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  const broken = structuredClone(rec591);
  broken.phases.push({
    id: "591-review-merge-ready-no-head",
    task_type: "レビュー",
    review_outcome: "MERGE-READY",
    findings: "MERGE-READY stated without reviewed head.",
    provenance: "coordinator review record (synthetic example)",
  });
  assert.equal(currentVerifiedHeadFromReviews(broken.phases), null);
  const check = validatePhaseRecord(broken);
  assert.equal(check.ok, false);
  assert.ok(
    check.issues.some((i) =>
      i.includes("positive readiness judgment requires well-formed head_sha_reviewed"),
    ),
  );
});

test("validatePhaseRecord rejects legacy Ready findings without head_sha_reviewed on #591 clone (example)", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  const broken = structuredClone(rec591);
  broken.verified_head_sha = null;
  broken.phases.push({
    id: "591-review-legacy-ready-no-head",
    task_type: "レビュー",
    findings: "Ready on an omitted head.",
    provenance: "coordinator review record (synthetic example)",
  });
  assert.equal(currentVerifiedHeadFromReviews(broken.phases), null);
  const check = validatePhaseRecord(broken);
  assert.equal(check.ok, false);
  assert.ok(
    check.issues.some((i) =>
      i.includes("positive readiness judgment requires well-formed head_sha_reviewed"),
    ),
  );
});

test("validatePhaseRecord NOT-READY with Ready prose does not require positive head (example)", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  const withdrawn = structuredClone(rec591);
  withdrawn.verified_head_sha = null;
  withdrawn.phases.push({
    id: "591-review-not-ready-ready-prose",
    task_type: "レビュー",
    review_outcome: "NOT-READY",
    findings: "Ready on paper only; explicit NOT-READY applies.",
    provenance: "coordinator review record (synthetic example)",
  });
  const check = validatePhaseRecord(withdrawn);
  assert.equal(check.ok, true, check.issues.join("; "));
  assert.ok(
    !check.issues.some((i) => i.includes("positive readiness judgment requires")),
  );
});

test("validatePhaseRecord rejects MERGE-READY with malformed head_sha_reviewed (example)", () => {
  const committed = validateCommittedPhaseRecordFiles();
  const rec591 = committed.records.find((r) => r?.record_id === "issue-553-pr-591");
  const broken = structuredClone(rec591);
  broken.phases.push({
    id: "591-review-merge-ready-bad-head",
    task_type: "レビュー",
    review_outcome: "MERGE-READY",
    head_sha_reviewed: "not-a-sha",
    provenance: "coordinator review record (synthetic example)",
  });
  const check = validatePhaseRecord(broken);
  assert.equal(check.ok, false);
  assert.ok(check.issues.some((i) => i.includes("malformed head_sha_reviewed")));
});

test("phase log practice entries link canonical #591 and #592 records", () => {
  const result = validatePhaseLogFile();
  assert.equal(result.ok, true, result.issues.join("; "));
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
