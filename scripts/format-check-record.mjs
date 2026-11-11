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
    return { status: "valid", usableForGuideline: true };
  }
  return { status: "stale", usableForGuideline: false };
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
  const thresholdFail = combined.match(
    /Coverage for lines \(([\d.]+)%\)/i,
  );
  if (thresholdFail) return Number(thresholdFail[1]);
  const allFiles = combined.match(
    /^All files\s+\|\s+[\d.]+\s+\|\s+[\d.]+\s+\|\s+[\d.]+\s+\|\s+([\d.]+)/m,
  );
  if (allFiles) return Number(allFiles[1]);
  const stmtLine = combined.match(
    /Statements\s*:\s*[\d.]+%\s*\([\d/]+\)[\s\S]*?Lines\s*:\s*([\d.]+)%/i,
  );
  if (stmtLine) return Number(stmtLine[1]);
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
  const totalLine = plain.split("\n").find((line) => /Total:/i.test(line));
  if (!totalLine) return "unknown";
  const cells = totalLine.split("|").map((cell) => cell.trim());
  const dupLinesCell = cells[6];
  if (!dupLinesCell) return "unknown";
  const pct = dupLinesCell.match(/\(([\d.]+)%\)/);
  if (pct) return Number(pct[1]);
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
      "Metrics are parsed from provided stdout/stderr only; missing or unparseable fields stay unknown (not 0).",
      "jscpd command exit 0 is warn-only in CI; duplicated-lines percent is not proof under the threshold.",
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
export function validatePhaseLogStructure(markdown) {
  const issues = [];
  if (!markdown.includes("## Issue #551")) {
    issues.push("missing heading ## Issue #551");
  }
  if (!markdown.includes("## Issue #475")) {
    issues.push("missing heading ## Issue #475");
  }
  if (!markdown.includes("693fff1d57c4f1ce6180dd3772fce997f0d392bb")) {
    issues.push("missing #551 verified head SHA");
  }
  if (!markdown.includes("798f4761693d6a38bb164b85859be98f0238fae7")) {
    issues.push("missing #475 verified head SHA");
  }
  if (!markdown.includes("phase-history")) {
    issues.push("missing phase-history blocks");
  }
  if (!markdown.includes("effort: unknown") && !markdown.includes("effort: \"unknown\"")) {
    issues.push("missing preserved unknown effort for #551");
  }
  if (!markdown.includes("文書の食い違い 5 件")) {
    issues.push("missing #475 doc mismatch count");
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
