export const REPLACE_SCHEDULE_STARTUP_NOT_SETTLED =
  "起動の復旧が終わっていないので、置き換えられません。";

export const REPLACE_SCHEDULE_UI_BUSY =
  "画面の操作が途中なので、置き換えられません。";

export const MCP_OPERATION_UI_BUSY = REPLACE_SCHEDULE_UI_BUSY;

export const MCP_OPERATION_FILE_BUSY =
  "ファイルの操作が途中なので、実行できません。";

export type McpUiBlockingInput = {
  fileBusy: boolean;
  titleEditing: boolean;
  detailPanelEditing: boolean;
  scheduleInlineEditing: boolean;
  reorderDragging: boolean;
  sidebarReorderDragging: boolean;
  chartBarDragging: boolean;
  modalDialogOpen: boolean;
  externalReloadConflictDialogOpen: boolean;
};

/** 操作の途中か。`replace_schedule` は衝突確認だけ開いているときは false。 */
export function assessMcpUiBlocking(
  input: McpUiBlockingInput,
  options?: { allowExternalReloadConflictDialog?: boolean },
): boolean {
  if (input.fileBusy) return true;
  if (input.titleEditing) return true;
  if (input.detailPanelEditing) return true;
  if (input.scheduleInlineEditing) return true;
  if (input.reorderDragging) return true;
  if (input.sidebarReorderDragging) return true;
  if (input.chartBarDragging) return true;
  if (input.modalDialogOpen) {
    if (
      options?.allowExternalReloadConflictDialog &&
      input.externalReloadConflictDialogOpen
    ) {
      return false;
    }
    return true;
  }
  return false;
}

export function assessMcpReplaceUiBlocking(input: McpUiBlockingInput): boolean {
  return assessMcpUiBlocking(input, {
    allowExternalReloadConflictDialog: true,
  });
}

export type McpOperationGateInput = {
  startupSettled: boolean;
  startupRecoveryDialogOpen: boolean;
  uiBlocking: boolean;
  discardInProgress: boolean;
  fileBusy: boolean;
};

export type McpOperationGateResult =
  | { ok: true; discardInProgress: boolean }
  | { ok: false; message: string };

export function assessMcpOperationGate(
  input: McpOperationGateInput,
): McpOperationGateResult {
  if (!input.startupSettled || input.startupRecoveryDialogOpen) {
    return { ok: false, message: REPLACE_SCHEDULE_STARTUP_NOT_SETTLED };
  }
  if (input.fileBusy) {
    return { ok: false, message: MCP_OPERATION_FILE_BUSY };
  }
  if (input.uiBlocking) {
    if (!input.discardInProgress) {
      return { ok: false, message: MCP_OPERATION_UI_BUSY };
    }
    return { ok: true, discardInProgress: true };
  }
  return { ok: true, discardInProgress: false };
}

export type McpActionEnvelope = {
  discardInProgress?: boolean;
  [key: string]: unknown;
};

export function parseMcpActionEnvelope(
  value: unknown,
): { ok: true; envelope: McpActionEnvelope } | { ok: false; message: string } {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      message: "操作の JSON として読めないので、実行できません。",
    };
  }
  const envelope = value as McpActionEnvelope;
  if (
    envelope.discardInProgress !== undefined &&
    typeof envelope.discardInProgress !== "boolean"
  ) {
    return {
      ok: false,
      message: "discardInProgress は true または false だけにしてください。",
    };
  }
  return { ok: true, envelope };
}

export function parseMcpActionStdinText(
  text: string,
): { ok: true; envelope: McpActionEnvelope } | { ok: false; message: string } {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  if (!normalized) {
    return {
      ok: false,
      message: "操作の JSON として読めないので、実行できません。",
    };
  }
  let data: unknown;
  try {
    data = JSON.parse(normalized);
  } catch {
    return {
      ok: false,
      message: "操作の JSON として読めないので、実行できません。",
    };
  }
  return parseMcpActionEnvelope(data);
}
