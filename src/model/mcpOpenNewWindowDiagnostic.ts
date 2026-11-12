import { invoke } from "@tauri-apps/api/core";

export const OPEN_NEW_WINDOW_TRACE_FILE = "open-new-window-trace.jsonl";

export const MCP_OPEN_NEW_WINDOW_DIAGNOSTIC_PHASES = [
  "bridge-receive",
  "bridge-emit",
  "bridge-emit-failed",
  "bridge-emit-retry",
  "bridge-timeout",
  "bridge-complete",
  "frontend-receive",
  "frontend-duplicate-skip",
  "frontend-execute-start",
  "frontend-created",
] as const;

export type McpOpenNewWindowDiagnosticPhase =
  (typeof MCP_OPEN_NEW_WINDOW_DIAGNOSTIC_PHASES)[number];

export type McpOpenNewWindowDiagnosticOrigin = "bridge" | "frontend";

export type McpOpenNewWindowDiagnosticRecord = {
  requestId: string;
  phase: McpOpenNewWindowDiagnosticPhase;
  origin: McpOpenNewWindowDiagnosticOrigin;
  windowLabel?: string;
  handlerLabel?: string;
  sequence?: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const WINDOW_LABEL_RE = /^(main|schedule-[0-9]+)$/;

export function isMcpOpenNewWindowDiagnosticPhase(
  value: string,
): value is McpOpenNewWindowDiagnosticPhase {
  return (MCP_OPEN_NEW_WINDOW_DIAGNOSTIC_PHASES as readonly string[]).includes(
    value,
  );
}

export function validateMcpOpenNewWindowWindowLabel(label: string): boolean {
  return label.length > 0 && label.length <= 64 && WINDOW_LABEL_RE.test(label);
}

export function validateMcpOpenNewWindowDiagnosticRecord(
  record: McpOpenNewWindowDiagnosticRecord,
): boolean {
  if (!UUID_RE.test(record.requestId)) return false;
  if (!isMcpOpenNewWindowDiagnosticPhase(record.phase)) return false;
  if (record.origin !== "bridge" && record.origin !== "frontend") return false;
  if (
    record.windowLabel != null &&
    !validateMcpOpenNewWindowWindowLabel(record.windowLabel)
  ) {
    return false;
  }
  if (
    record.handlerLabel != null &&
    !validateMcpOpenNewWindowWindowLabel(record.handlerLabel)
  ) {
    return false;
  }
  if (
    record.sequence != null &&
    (!Number.isInteger(record.sequence) ||
      record.sequence < 0 ||
      record.sequence > 3)
  ) {
    return false;
  }
  return true;
}

export function recordMcpOpenNewWindowDiagnostic(
  record: McpOpenNewWindowDiagnosticRecord,
): void {
  if (!validateMcpOpenNewWindowDiagnosticRecord(record)) {
    return;
  }
  void invoke("record_open_new_window_diagnostic", { record }).catch(() => {});
}
