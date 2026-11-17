/**
 * Issue #553: log consult session.md reads via beforeReadFile (allow-only).
 */
import { pathToFileURL } from "node:url";
import {
  emitAgentObs,
  formatConsultSessionReadMarker,
  isConsultSessionReadPath,
} from "./agent-obs.mjs";

/**
 * @param {unknown} input
 * @returns {{ permission: 'allow' }}
 */
export function handleBeforeReadFile(input) {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const { file_path: filePath } = /** @type {{ file_path?: unknown }} */ (
      input
    );
    if (isConsultSessionReadPath(
      typeof filePath === "string" ? filePath : undefined,
    )) {
      emitAgentObs(formatConsultSessionReadMarker(
        typeof filePath === "string" ? filePath : undefined,
      ));
    }
  }
  return { permission: "allow" };
}

/**
 * @param {{ permission: string }} payload
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
  const result = handleBeforeReadFile(parsed);
  process.stdout.write(formatHookStdout(result));
  process.exit(0);
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runHookCli();
}