/**
 * Issue #553: log consult session.md reads via postToolUse (Read matcher).
 */
import { pathToFileURL } from "node:url";
import {
  CONSULT_SESSION_READ_MARKER,
  appendAgentObsLog,
  isConsultSessionReadPath,
  readPathFromPostToolUse,
} from "./agent-obs.mjs";

/** @typedef {{ additional_context?: string }} PostToolUseResult */

/**
 * @param {unknown} input
 * @returns {PostToolUseResult}
 */
export function handlePostToolUse(input) {
  const readPath = readPathFromPostToolUse(input);
  if (!readPath || !isConsultSessionReadPath(readPath)) {
    return {};
  }
  appendAgentObsLog(CONSULT_SESSION_READ_MARKER);
  return { additional_context: CONSULT_SESSION_READ_MARKER };
}

/**
 * @param {PostToolUseResult} payload
 */
export function formatHookStdout(payload) {
  return `${JSON.stringify(payload)}\n`;
}

async function runHookCli() {
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += chunk;
  }
  let parsed = null;
  try {
    parsed = raw.trim() === "" ? null : JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const result = parsed === null ? {} : handlePostToolUse(parsed);
  process.stdout.write(formatHookStdout(result));
  process.exit(0);
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runHookCli();
}