/**
 * Formats a structured execution record from caller-supplied command results (Issue #553 item 5).
 * Does not spawn npm, cargo, jscpd, or madge — provenance is always "provided".
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FULL_SHA_RE = /^[0-9a-f]{40}$/i;

/** @param {string} text */
export function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

/** @param {string} text */
export function normalizeTableSeparators(text) {
  return text.replace(/\u2502/g, "|");
}

/**
 * @param {string | undefined | null} sha
 * @returns {{ value: string | null, wellFormed: boolean }}
 */
export function describeSha(sha) {
  if (sha == null || String(sha).trim() === "") {
    return { value: null, wellFormed: false };
  }
  const value = String(sha).trim().toLowerCase();
  return { value, wellFormed: FULL_SHA_RE.test(value) };
}

/**
 * @param {string | null} recorded
 * @param {string | null} current
 * @param {boolean} recordedOk
 * @param {boolean} currentOk
 */
export function shaIdentityStatus(recorded, current, recordedOk, currentOk) {
  if (!recordedOk || !currentOk) {
    return { status: "invalid", usableForGuideline: false };
  }
  if (recorded === current) {
    return { status: "valid", usableForGuideline: false };
  }
  return { status: "stale", usableForGuideline: false };
}

/**
 * SHA match alone does not make a record usable; commands must all pass when present.
 * @param {"valid" | "stale" | "invalid"} identityStatus
 * @param {"passed" | "failed" | "unknown"} aggregateCommandStatus
 */
export function usableForGuidelineFromRun(identityStatus, aggregateCommandStatus) {
  return identityStatus === "valid" && aggregateCommandStatus === "passed";
}

/**
 * @param {string} combined
 * @returns {number | "unknown"}
 */
export function parseLintWarningCount(combined) {
  if (!combined?.trim()) return "unknown";
  const problems = combined.match(
    /(\d+)\s+problems?\s*\(\s*(\d+)\s+errors?,\s*(\d+)\s+warnings?\s*\)/i,
  );
  if (problems) return Number(problems[3]);
  const warningsOnly = combined.match(/(\d+)\s+warnings?\b/i);
  if (warningsOnly) return Number(warningsOnly[1]);
  return "unknown";
}

/**
 * @param {string} combined
 * @returns {number | "unknown"}
 */
export function parseCoverageLinesPercent(combined) {
  if (!combined?.trim()) return "unknown";

  const summaryBlock = combined.match(
    /Coverage summary[\s\S]*?^Lines\s*:\s*([\d.]+)%/m,
  );
  if (summaryBlock) return Number(summaryBlock[1]);

  const allFiles = combined.match(
    /^All files\s+\|\s+[\d.]+\s+\|\s+[\d.]+\s+\|\s+[\d.]+\s+\|\s+([\d.]+)/m,
  );
  if (allFiles) return Number(allFiles[1]);

  const globalThresholdOnly = combined.match(
    /Coverage for lines \(([\d.]+)%\) does not meet global threshold/i,
  );
  if (globalThresholdOnly) return Number(globalThresholdOnly[1]);

  return "unknown";
}

/**
 * @param {string} combined
 * @returns {number | "unknown"}
 */
export function parseMadgeCycleCount(combined) {
  if (!combined?.trim()) return "unknown";
  const ok = combined.match(/madge circular baseline OK \((\d+) cycles?\)/i);
  if (ok) return Number(ok[1]);
  const countErr = combined.match(/madge circular count (\d+)/i);
  if (countErr) return Number(countErr[1]);
  return "unknown";
}

/**
 * @param {string} combined
 * @returns {number | "unknown"}
 */
export function parseJscpdDuplicatedLinesPercent(combined) {
  if (!combined?.trim()) return "unknown";
  const plain = normalizeTableSeparators(stripAnsi(combined));

  const overThreshold = plain.match(
    /ERROR:\s*jscpd found too many duplicates \(([\d.]+)%\) over threshold/i,
  );
  if (overThreshold) return Number(overThreshold[1]);

  const detectionLine = plain.match(
    /Duplications detection:[^\n]*\(\s*([\d.]+)%\s*\)\s*duplicated lines/i,
  );
  if (detectionLine) return Number(detectionLine[1]);

  const totalLine = plain.split("\n").find((line) => /Total:/i.test(line));
  if (totalLine) {
    const cells = totalLine.split("|").map((cell) => cell.trim());
    const dupLinesCell = cells[6];
    if (dupLinesCell) {
      const pct = dupLinesCell.match(/\(([\d.]+)%\)/);
      if (pct) return Number(pct[1]);
    }
  }

  return "unknown";
}

/**
 * @param {Array<{ cmd?: string, exit?: number, stdout?: string, stderr?: string }>} results
 */
export function collectMetrics(results) {
  let coverageLinesPercent = "unknown";
  let lintWarnings = "unknown";
  let madgeCycleCount = "unknown";
  let jscpdDuplicatedLinesPercent = "unknown";

  for (const row of results) {
    const cmd = String(row.cmd ?? "");
    const combined = `${row.stdout ?? ""}\n${row.stderr ?? ""}`;
    const cmdLower = cmd.toLowerCase();

    if (lintWarnings === "unknown" && (cmdLower.includes("lint") || cmdLower.includes("eslint"))) {
      const parsed = parseLintWarningCount(combined);
      if (parsed !== "unknown") lintWarnings = parsed;
    }
    if (
      coverageLinesPercent === "unknown" &&
      (cmdLower.includes("test:ci") ||
        cmdLower.includes("vitest") ||
        cmdLower.includes("coverage"))
    ) {
      const parsed = parseCoverageLinesPercent(combined);
      if (parsed !== "unknown") coverageLinesPercent = parsed;
    }
    if (
      madgeCycleCount === "unknown" &&
      (cmdLower.includes("madge") || cmdLower.includes("check:madge"))
    ) {
      const parsed = parseMadgeCycleCount(combined);
      if (parsed !== "unknown") madgeCycleCount = parsed;
    }
    if (
      jscpdDuplicatedLinesPercent === "unknown" &&
      (cmdLower.includes("jscpd") || cmdLower.includes("architecture-warn"))
    ) {
      const parsed = parseJscpdDuplicatedLinesPercent(combined);
      if (parsed !== "unknown") jscpdDuplicatedLinesPercent = parsed;
    }
  }

  return {
    coverageLinesPercent,
    lintWarnings,
    madgeCycleCount,
    jscpdDuplicatedLinesPercent,
  };
}

/**
 * @param {{
 *   results?: Array<{ cmd?: string, exit?: number, stdout?: string, stderr?: string }>,
 *   sha?: string,
 *   currentSha?: string,
 *   durationMs?: number,
 * }} input
 */
export function formatExecutionRecord(input) {
  const results = Array.isArray(input?.results) ? input.results : [];
  const recorded = describeSha(input?.sha);
  const current = describeSha(input?.currentSha);
  const shaIdentity = shaIdentityStatus(
    recorded.value,
    current.value,
    recorded.wellFormed,
    current.wellFormed,
  );

  /** @type {number | "unknown"} */
  let durationMs = "unknown";
  if (typeof input?.durationMs === "number" && Number.isFinite(input.durationMs)) {
    durationMs = input.durationMs;
  }

  const commands = results.map((row) => {
    const exit = typeof row.exit === "number" ? row.exit : null;
    return {
      cmd: row.cmd ?? "",
      exit,
      status:
        exit === null ? "unknown" : exit === 0 ? "passed" : "failed",
    };
  });

  const anyFailed = commands.some((c) => c.status === "failed");
  const anyUnknown = commands.some((c) => c.status === "unknown");
  const aggregateCommandStatus = anyFailed
    ? "failed"
    : anyUnknown
      ? "unknown"
      : commands.length > 0
        ? "passed"
        : "unknown";

  const metrics = collectMetrics(results);

  shaIdentity.usableForGuideline = usableForGuidelineFromRun(
    shaIdentity.status,
    aggregateCommandStatus,
  );

  return {
    kind: "execution-record",
    provenance: "provided",
    recordedHeadSha: recorded,
    currentHeadSha: current,
    shaIdentity,
    durationMs: {
      value: durationMs,
      provenance: durationMs === "unknown" ? "unknown" : "provided",
    },
    commands,
    aggregateCommandStatus,
    metrics,
    limits: [
      "shaIdentity status valid means recordedHeadSha matches currentHeadSha only; it is not proof these commands ran on that tree.",
      "usableForGuideline is true only when shaIdentity is valid and every listed command has exit 0.",
      "Metrics are parsed from provided stdout/stderr only; missing or unparseable fields stay unknown (not 0).",
      "jscpd command exit 0 is warn-only in CI; it is not proof duplicated lines are under the configured threshold.",
    ],
  };
}

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PHASE_LOG = path.join(REPO_ROOT, "docs/agents-phase-log.md");

/**
 * Structural checks for agents-phase-log.md (migration #551 / #475).
 * Does not forbid numeric token fields when present.
 * @param {string} markdown
 */
const PHASE_LOG_CAVEAT =
  "計画の軽い見直しは、別の Cloud Agent セッションとして残らないインライン確認であり、索引に無いことだけをもって省略したとは書かない";

/**
 * @param {string} markdown full phase log
 * @returns {string}
 */
export function extractIssue475PhaseYaml(markdown) {
  const start = markdown.indexOf("## Issue #475");
  if (start < 0) return "";
  const rest = markdown.slice(start);
  const nextHeading = rest.search(/\n## (?!#)/);
  const block = nextHeading > 0 ? rest.slice(0, nextHeading) : rest;
  const yamlMatch = block.match(/```yaml\n([\s\S]*?)```/);
  return yamlMatch?.[1] ?? "";
}

/**
 * Historical #475 phase-history facts (source-backed migration).
 * @param {string} phaseYaml content inside the #475 phase-history fence
 */
export function validateIssue475HistoricalPhases(phaseYaml) {
  const issues = [];
  const segments = phaseYaml.split(/(?=- task_type:)/).filter((s) => s.includes("task_type:"));

  const findPhase = (label) => segments.find((s) => new RegExp(`task_type:\\s*${label}`).test(s));

  const plan = findPhase("計画");
  if (!plan) {
    issues.push("missing #475 計画 phase");
  } else {
    if (!/effort:\s*high\b/m.test(plan)) {
      issues.push("#475 計画 effort must be high");
    }
    if (!plan.includes("coordinator launch record")) {
      issues.push("#475 計画 missing coordinator launch record source");
    }
  }

  const review = findPhase("レビュー");
  if (!review) {
    issues.push("missing #475 レビュー phase");
  } else {
    if (!/effort:\s*high\b/m.test(review)) {
      issues.push("#475 レビュー effort must be high");
    }
    if (!review.includes("coordinator review record")) {
      issues.push("#475 レビュー missing coordinator review record source");
    }
  }

  const implement = findPhase("実装");
  if (!implement) {
    issues.push("missing #475 実装 phase");
  } else {
    if (!/model_id:\s*composer-2\.5/.test(implement)) {
      issues.push("#475 実装 model_id must be composer-2.5");
    }
    if (!/effort:\s*unknown\b/m.test(implement)) {
      issues.push("#475 実装 effort must be unknown");
    }
  }

  const fix = findPhase("修正");
  if (!fix) {
    issues.push("missing #475 修正 phase");
  } else {
    if (!/model_id:\s*composer-2\.5/.test(fix)) {
      issues.push("#475 修正 model_id must be composer-2.5");
    }
    if (!/effort:\s*unknown\b/m.test(fix)) {
      issues.push("#475 修正 effort must be unknown");
    }
  }

  return { ok: issues.length === 0, issues };
}

export function validatePhaseLogStructure(markdown) {
  const issues = [];
  if (!markdown.includes("## Issue #551")) {
    issues.push("missing heading ## Issue #551");
  }
  if (!markdown.includes("## Issue #475")) {
    issues.push("missing heading ## Issue #475");
  }
  if (!markdown.includes("verified_head_sha:")) {
    issues.push("missing verified_head_sha fields");
  }
  if (!markdown.includes("693fff1d57c4f1ce6180dd3772fce997f0d392bb")) {
    issues.push("missing #551 verified head SHA");
  }
  if (!markdown.includes("798f4761693d6a38bb164b85859be98f0238fae7")) {
    issues.push("missing #475 verified head SHA");
  }
  if (!markdown.includes("### phase-history")) {
    issues.push("missing phase-history headings");
  }
  if (!markdown.includes("31 テキストファイル +2796 / −53、34 バイナリ")) {
    issues.push("missing #551 git numstat");
  }
  if (!markdown.includes("26 テキストファイル +1922 / −33、8 バイナリ")) {
    issues.push("missing #475 git numstat");
  }
  const issue551 = markdown.split("## Issue #475")[0] ?? "";
  if (!issue551.includes("review_findings: unknown")) {
    issues.push("missing #551 review_findings unknown");
  }
  if (!issue551.includes("fix_rounds: unknown")) {
    issues.push("missing #551 merge_summary fix_rounds unknown");
  }
  if (!(issue551.includes("effort: unknown") || issue551.includes('effort: "unknown"'))) {
    issues.push("missing #551 effort unknown in phases");
  }
  const issue475 = markdown.slice(markdown.indexOf("## Issue #475"));
  if (!issue475.includes("文書の食い違い 5 件")) {
    issues.push("missing #475 doc mismatch count");
  }
  if (!issue475.includes("fix_rounds: unknown")) {
    issues.push("missing #475 merge_summary fix_rounds unknown");
  }

  const issue475Yaml = extractIssue475PhaseYaml(markdown);
  if (!issue475Yaml) {
    issues.push("missing #475 phase-history yaml fence");
  } else {
    const phaseCheck = validateIssue475HistoricalPhases(issue475Yaml);
    if (!phaseCheck.ok) issues.push(...phaseCheck.issues);
  }

  if (!markdown.includes(PHASE_LOG_CAVEAT)) {
    issues.push("missing coordinator light plan review caveat");
  }
  if (markdown.includes("旧一行表（2026-03")) {
    issues.push("fabricated old table date");
  }
  return { ok: issues.length === 0, issues };
}

/** @param {string} [filePath] */
export function validatePhaseLogFile(filePath = PHASE_LOG) {
  const markdown = readFileSync(filePath, "utf8");
  return validatePhaseLogStructureFull(markdown);
}

const PHASE_RECORDS_DIR = path.join(REPO_ROOT, "docs/phase-records");
const SESSION_ID_RE =
  /^bc-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EFFORT_BASIS_ALLOWED = new Set(["configured", "runtime", "unknown"]);
const KNOWN_INTEGRATION_STATES = new Set(["open", "merged", "closed"]);

/**
 * @param {unknown} effort
 * @returns {boolean}
 */
function effortClaimsConfiguredLevel(effort) {
  if (effort == null) return false;
  const s = String(effort).trim().toLowerCase();
  return s !== "" && s !== "unknown";
}

/**
 * @param {unknown} record
 * @returns {{ ok: boolean, issues: string[] }}
 */
export function validatePhaseRecord(record) {
  const issues = [];
  if (record == null || typeof record !== "object") {
    return { ok: false, issues: ["record must be an object"] };
  }
  const r = /** @type {Record<string, unknown>} */ (record);

  if (typeof r.record_id !== "string" || !r.record_id.trim()) {
    issues.push("record_id required");
  }

  if (!Array.isArray(r.phases) || r.phases.length === 0) {
    issues.push("phases must be a non-empty array");
  }

  const phases = Array.isArray(r.phases) ? r.phases : [];
  const seenIds = new Set();
  let substantiveFixCount = 0;

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    if (phase == null || typeof phase !== "object") {
      issues.push(`phases[${i}] must be an object`);
      continue;
    }
    const p = /** @type {Record<string, unknown>} */ (phase);
    const id = p.id;
    if (typeof id !== "string" || !id.trim()) {
      issues.push(`phases[${i}] missing stable id`);
    } else if (seenIds.has(id)) {
      issues.push(`duplicate phase id ${id}`);
    } else {
      seenIds.add(id);
    }

    if (typeof p.task_type !== "string" || !p.task_type.trim()) {
      issues.push(`phases[${i}] missing task_type`);
    }

    const basis = p.effort_basis;
    if (basis != null && !EFFORT_BASIS_ALLOWED.has(String(basis))) {
      issues.push(`phases[${i}] invalid effort_basis ${basis}`);
    }

    if (effortClaimsConfiguredLevel(p.effort)) {
      const b = basis == null ? "unknown" : String(basis);
      if (b === "unknown") {
        issues.push(
          `phases[${i}] effort ${p.effort} requires effort_basis configured or runtime`,
        );
      }
    }

    if (p.session_id != null && String(p.session_id).trim() !== "") {
      if (!SESSION_ID_RE.test(String(p.session_id).trim())) {
        issues.push(`phases[${i}] malformed session_id`);
      }
    }

    for (const field of ["head_sha_produced", "head_sha_reviewed"]) {
      if (p[field] != null && String(p[field]).trim() !== "") {
        const { wellFormed } = describeSha(String(p[field]));
        if (!wellFormed) {
          issues.push(`phases[${i}] malformed ${field}`);
        }
      }
    }

    if (p.task_type === "修正" && p.substantive_fix !== false) {
      substantiveFixCount += 1;
    }
  }

  if (r.verified_head_sha != null && String(r.verified_head_sha).trim() !== "") {
    const { wellFormed } = describeSha(String(r.verified_head_sha));
    if (!wellFormed) {
      issues.push("malformed verified_head_sha");
    }
  }

  const integration = r.integration_status;
  if (integration != null && typeof integration === "object") {
    const st = /** @type {Record<string, unknown>} */ (integration).pr_state;
    if (st != null && !KNOWN_INTEGRATION_STATES.has(String(st))) {
      issues.push(`integration_status.pr_state invalid: ${st}`);
    }
    const head = /** @type {Record<string, unknown>} */ (integration).pr_head_sha;
    if (head != null && String(head).trim() !== "") {
      const { wellFormed } = describeSha(String(head));
      if (!wellFormed) issues.push("malformed integration_status.pr_head_sha");
    }
    const mergeSha = /** @type {Record<string, unknown>} */ (integration).merge_commit_sha;
    if (mergeSha != null && String(mergeSha).trim() !== "") {
      const { wellFormed } = describeSha(String(mergeSha));
      if (!wellFormed) issues.push("malformed integration_status.merge_commit_sha");
    }
  }

  const fixRounds = r.fix_rounds;
  if (typeof fixRounds === "number") {
    if (fixRounds !== substantiveFixCount) {
      issues.push(
        `fix_rounds ${fixRounds} does not match substantive 修正 count ${substantiveFixCount}`,
      );
    }
  } else if (fixRounds !== "unknown") {
    issues.push("fix_rounds must be a number or unknown");
  }

  if (!Array.isArray(r.corrections)) {
    issues.push("corrections must be an array (may be empty)");
  } else {
    const corrIds = new Set();
    for (const c of r.corrections) {
      if (c == null || typeof c !== "object") continue;
      const cid = /** @type {Record<string, unknown>} */ (c).id;
      if (typeof cid === "string" && corrIds.has(cid)) {
        issues.push(`duplicate correction id ${cid}`);
      }
      if (typeof cid === "string") corrIds.add(cid);
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Append-only revision: prior phase ids and their task_type must remain; phases may grow.
 * @param {unknown} previous
 * @param {unknown} next
 */
export function validatePhaseRecordRevision(previous, next) {
  const base = validatePhaseRecord(next);
  const issues = [...base.issues];
  if (previous == null || typeof previous !== "object") {
    issues.push("previous record required for revision check");
    return { ok: false, issues };
  }
  if (next == null || typeof next !== "object") {
    issues.push("next record required");
    return { ok: false, issues };
  }
  const prevPhases = Array.isArray(
    /** @type {Record<string, unknown>} */ (previous).phases,
  )
    ? /** @type {Record<string, unknown>} */ (previous).phases
    : [];
  const nextPhases = Array.isArray(
    /** @type {Record<string, unknown>} */ (next).phases,
  )
    ? /** @type {Record<string, unknown>} */ (next).phases
    : [];
  const nextById = new Map(
    nextPhases
      .filter((p) => p && typeof p === "object" && typeof p.id === "string")
      .map((p) => [String(p.id), p]),
  );

  for (const phase of prevPhases) {
    if (phase == null || typeof phase !== "object") continue;
    const p = /** @type {Record<string, unknown>} */ (phase);
    const id = p.id;
    if (typeof id !== "string") continue;
    const kept = nextById.get(id);
    if (!kept) {
      issues.push(`revision dropped phase id ${id}`);
      continue;
    }
    if (String(kept.task_type) !== String(p.task_type)) {
      issues.push(`revision changed task_type for phase id ${id}`);
    }
  }

  const prevCorr = Array.isArray(
    /** @type {Record<string, unknown>} */ (previous).corrections,
  )
    ? /** @type {Record<string, unknown>} */ (previous).corrections
    : [];
  const nextCorr = Array.isArray(
    /** @type {Record<string, unknown>} */ (next).corrections,
  )
    ? /** @type {Record<string, unknown>} */ (next).corrections
    : [];
  if (nextCorr.length < prevCorr.length) {
    issues.push("revision removed correction entries");
  }

  return { ok: issues.length === 0, issues };
}

/**
 * @param {string} [dir]
 * @returns {{ ok: boolean, issues: string[], records: unknown[] }}
 */
export function validateCommittedPhaseRecordFiles(dir = PHASE_RECORDS_DIR) {
  const issues = [];
  const records = [];
  const files = ["issue-553-pr591.json", "issue-553-pr592.json"];
  for (const name of files) {
    const filePath = path.join(dir, name);
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (err) {
      issues.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    records.push(parsed);
    const check = validatePhaseRecord(parsed);
    if (!check.ok) {
      issues.push(...check.issues.map((msg) => `${name}: ${msg}`));
    }
  }
  return { ok: issues.length === 0, issues, records };
}

const PR591_READY_SHA = "60d5252149558ddf0146866f0cd2f60995ee03e4";
const PR592_VERIFIED_SHA = "eb0c804e42a6c1359920da7b202f103124dcbb0a";
const PR592_MERGE_SHA = "4879ed7a02eb8d6df1ba47c8e4f894bfed83c6b2";

/**
 * Cross-check phase log prose links and key SHAs against canonical JSON records.
 * Does not assert PR #591 remains open forever — only documents as-of rows in JSON.
 * @param {string} markdown
 */
export function validatePhaseLogPracticeEntries(markdown) {
  const issues = [];
  if (!markdown.includes("## Issue #553 — PR #591")) {
    issues.push("missing heading ## Issue #553 — PR #591");
  }
  if (!markdown.includes("## Issue #553 — PR #592")) {
    issues.push("missing heading ## Issue #553 — PR #592");
  }
  if (!markdown.includes("docs/phase-records/issue-553-pr591.json")) {
    issues.push("missing canonical link to issue-553-pr591.json");
  }
  if (!markdown.includes("docs/phase-records/issue-553-pr592.json")) {
    issues.push("missing canonical link to issue-553-pr592.json");
  }
  if (!markdown.includes(PR591_READY_SHA)) {
    issues.push("missing #591 ready_head_sha in phase log");
  }
  if (!markdown.includes(PR592_VERIFIED_SHA)) {
    issues.push("missing #592 verified_head_sha in phase log");
  }
  if (!markdown.includes(PR592_MERGE_SHA)) {
    issues.push("missing #592 merge commit sha in phase log");
  }

  const committed = validateCommittedPhaseRecordFiles();
  if (!committed.ok) {
    issues.push(...committed.issues);
  }

  return { ok: issues.length === 0, issues };
}

/**
 * @param {string} markdown
 */
export function validatePhaseLogStructureFull(markdown) {
  const structural = validatePhaseLogStructure(markdown);
  const practice = validatePhaseLogPracticeEntries(markdown);
  const issues = [...structural.issues, ...practice.issues];
  return { ok: issues.length === 0, issues };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) {
    throw new Error("stdin JSON required");
  }
  return JSON.parse(text);
}

async function main() {
  const input = await readStdin();
  const record = formatExecutionRecord(input);
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
