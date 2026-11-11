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
  return validatePhaseLogStructure(markdown);
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
