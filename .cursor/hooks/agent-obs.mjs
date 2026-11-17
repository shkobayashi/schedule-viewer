/**
 * Issue #553: stable grep markers for agent behavior (transcript + optional local JSONL).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOOK_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.join(HOOK_DIR, "..", "..");
export const AGENT_OBS_LOG_REL = ".cursor/hooks/logs/agent-obs.jsonl";

const MAX_CMD_CHARS = 160;

/**
 * @param {string} command
 * @returns {string}
 */
export function shortRedactedCommand(command) {
  if (typeof command !== "string") {
    return "<invalid>";
  }
  let s = command.replace(/\s+/g, " ").trim();
  if (s === "") {
    return "<empty>";
  }
  const home = os.homedir();
  if (home) {
    s = s.split(home).join("~");
  }
  s = s.replace(
    /\b[A-Za-z0-9_]*(TOKEN|SECRET|PASSWORD|API_KEY)[A-Za-z0-9_]*=\S+/gi,
    "$1=<redacted>",
  );
  s = s.replace(/\bsk-[A-Za-z0-9]{8,}\b/g, "sk-<redacted>");
  if (s.length > MAX_CMD_CHARS) {
    return `${s.slice(0, MAX_CMD_CHARS - 3)}...`;
  }
  return s;
}

/**
 * @param {'deny' | 'allow'} decision
 * @param {string} rule
 * @param {string} command
 * @returns {string}
 */
export function formatBlockHistoryRewriteMarker(decision, rule, command) {
  const cmd = shortRedactedCommand(command);
  return `[agent-obs] hook=block-history-rewrite decision=${decision} rule=${rule} cmd=${cmd}`;
}

/**
 * @param {string} [filePath]
 * @returns {string}
 */
export function formatConsultSessionReadMarker(filePath) {
  const rel = toRepoRelativeConsultPath(filePath);
  return `[agent-obs] hook=consult-session-read decision=log path=${rel}`;
}

/**
 * @param {string | undefined} filePath
 * @returns {string}
 */
export function toRepoRelativeConsultPath(filePath) {
  if (typeof filePath !== "string" || filePath.trim() === "") {
    return ".cursor/skills/consult/references/session.md";
  }
  const normalized = filePath.replace(/\\/g, "/");
  const marker = ".cursor/skills/consult/references/session.md";
  const idx = normalized.lastIndexOf(marker);
  if (idx !== -1) {
    return normalized.slice(idx);
  }
  if (normalized.endsWith("skills/consult/references/session.md")) {
    return marker;
  }
  return marker;
}

/**
 * @param {string | undefined} filePath
 * @returns {boolean}
 */
export function isConsultSessionReadPath(filePath) {
  if (typeof filePath !== "string") return false;
  const normalized = filePath.replace(/\\/g, "/");
  return (
    normalized.endsWith(".cursor/skills/consult/references/session.md") ||
    normalized.endsWith("/skills/consult/references/session.md")
  );
}

/**
 * @returns {string}
 */
export function resolveAgentObsLogPath() {
  const override = process.env.AGENT_OBS_LOG_PATH;
  if (typeof override === "string" && override.trim() !== "") {
    return path.resolve(override);
  }
  return path.join(REPO_ROOT, AGENT_OBS_LOG_REL);
}

/**
 * @param {string} marker
 * @param {string} [logPath]
 */
export function appendAgentObsLog(marker, logPath = resolveAgentObsLogPath()) {
  try {
    const dir = path.dirname(logPath);
    fs.mkdirSync(dir, { recursive: true });
    const row = `${JSON.stringify({
      ts: new Date().toISOString(),
      marker,
    })}\n`;
    fs.appendFileSync(logPath, row, { encoding: "utf8" });
  } catch {
    // Log failure must never affect hook decisions.
  }
}

/**
 * @param {string} marker
 * @param {string} [logPath]
 */
export function emitAgentObs(marker, logPath = resolveAgentObsLogPath()) {
  try {
    process.stderr.write(`${marker}\n`);
  } catch {
    // ignore
  }
  appendAgentObsLog(marker, logPath);
}

/**
 * @param {string | undefined} agentMessage
 * @param {string} marker
 * @returns {string}
 */
export function appendMarkerToAgentMessage(agentMessage, marker) {
  if (!agentMessage) {
    return marker;
  }
  return `${agentMessage}\n${marker}`;
}