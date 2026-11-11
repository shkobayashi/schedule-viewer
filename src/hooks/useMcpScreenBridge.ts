import { useEffect, useRef, type RefObject } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { loadBaselineDiffsText } from "../model/baselineDiffsLoad";
import { loadScheduleDiffText } from "../model/scheduleDiffLoad";
import { assessReplaceScheduleLevelCount } from "../model/hierarchyLevelEdit";
import {
  REPLACE_SCHEDULE_UI_BUSY,
  assessReplaceScheduleGate,
  capReplaceScheduleDiffText,
  parseReplaceScheduleArguments,
  type ReplaceScheduleDocumentResult,
} from "../model/replaceSchedule";
import {
  assessMcpOperationGate,
  parseMcpActionEnvelope,
} from "../model/mcpOperationGate";
import {
  MCP_TOOL_CATALOG_ACTION,
  MCP_TOOL_CLOSE_WINDOW,
  MCP_TOOL_EDIT_PLAN,
  MCP_TOOL_FILE_ACTION,
  MCP_TOOL_FOCUS_WINDOW,
  MCP_TOOL_HISTORY,
  MCP_TOOL_MINIMIZE_WINDOW,
  MCP_TOOL_OPEN_NEW_WINDOW,
  MCP_TOOL_SET_PREFERENCES,
  MCP_TOOL_SET_VIEW,
  MCP_TOOL_EXPLAIN_VIEW,
  MCP_TOOL_EXPLAIN_OVERLAY,
  MCP_TOOL_APPLY_EXPLANATION_PATTERN,
} from "../model/mcpToolNames";
import {
  executeMcpActionTool,
  type McpActionExecutorContext,
} from "./mcpActionExecutor";
import {
  buildFilteredTasksPayload,
  buildScheduleDiffPayload,
  buildSelectedTaskPayload,
  buildSelectedTasksPayload,
  MCP_TOOL_BASELINE_DIFFS,
  MCP_TOOL_CURRENT_SCHEDULE,
  MCP_TOOL_FILTERED_TASKS,
  MCP_TOOL_REPLACE_SCHEDULE,
  MCP_TOOL_SCHEDULE_DIFF,
  MCP_TOOL_SELECTED_TASK,
  MCP_TOOL_SELECTED_TASKS,
  mcpPayloadToToolBody,
  mcpPlainTextToolBody,
  mcpReadToolsPayloadToToolBody,
  isMcpReadToolName,
  mcpToolErrorBody,
  type McpToolResultBody,
} from "../model/screenContext";
import { captureMainElementForMcp } from "../model/captureMainForMcp";
import { isTauri } from "../model/scheduleFile";
import { setMcpInProgressGeneration } from "../model/mcpInProgressInvalidation";
import type { ScheduleDocument, ScheduleId } from "../model/types";
import type { TaskBarAnchor } from "../model/connections";
import {
  mcpFilteredTasksPayloadInputFromSnap,
  mcpSelectedTaskPayloadInputFromSnap,
  mcpSelectedTasksPayloadInputFromSnap,
  type McpScreenBridgeFilteredTasksSnap,
  type McpScreenRequest,
} from "../model/mcpScreenBridgeSnap";
import { recordMcpOpenNewWindowDiagnostic } from "../model/mcpOpenNewWindowDiagnostic";

export type UseMcpScreenBridgeInput = McpScreenBridgeFilteredTasksSnap & {
    selectedTaskId: ScheduleId | null;
    selectedTaskIds: readonly ScheduleId[];
    getScheduleFilePath: () => string | null;
    getCanonicalJson?: () => string;
    scheduleCurrentJson: string;
    scheduleBaselineJson: string;
    startupSettled: boolean;
    startupRecoveryDialogOpen: boolean;
    fileBusy: boolean;
    mcpReplaceUiBlocking: () => boolean;
    mcpUiBlocking: () => boolean;
    onDiscardInProgress: () => void;
    mcpActionExecutor: McpActionExecutorContext;
    replaceScheduleDocument: (
      document: ScheduleDocument,
    ) => ReplaceScheduleDocumentResult;
    onReplaceScheduleApplied?: (result: ReplaceScheduleDocumentResult) => void;
    prepareMcpPngCapture?: () => void;
    finalizeMcpPngCapture?: () => void;
    mainElement: HTMLElement | null;
    colorsCatalogError?: string | null;
    explainOverlayLiveAnchorsRef: RefObject<
      ReadonlyMap<ScheduleId, TaskBarAnchor>
    >;
    /** App から渡されるが bridge 本体では未参照（型互換のため残す）。 */
    headerHeight?: number;
    milestoneBandHeight?: number;
  };

export function useMcpScreenBridge(input: UseMcpScreenBridgeInput): void {
  const inputRef = useRef(input);
  inputRef.current = input;
  const mcpActionRequestIdsInFlight = useRef(new Set<string>());

  useEffect(() => {
    if (!isTauri()) return;

    function liveAnchorsFromSnap(snap: UseMcpScreenBridgeInput) {
      return snap.explainOverlayLiveAnchorsRef.current;
    }

    async function reply(
      id: string,
      generation: number,
      body: McpToolResultBody,
      invalidateInProgress = false,
    ) {
      await invoke("mcp_reply", {
        id,
        generation,
        body,
        invalidateInProgress,
      });
    }

    function invalidateAfterReject(discardInProgress: boolean): boolean {
      return !discardInProgress;
    }

    async function replyError(
      payload: McpScreenRequest,
      message: string,
      discardInProgress: boolean,
    ) {
      await reply(
        payload.id,
        payload.generation,
        mcpToolErrorBody(message),
        invalidateAfterReject(discardInProgress),
      );
    }

    const MCP_ACTION_TOOLS = new Set([
      MCP_TOOL_SET_VIEW,
      MCP_TOOL_EXPLAIN_VIEW,
      MCP_TOOL_EXPLAIN_OVERLAY,
      MCP_TOOL_APPLY_EXPLANATION_PATTERN,
      MCP_TOOL_EDIT_PLAN,
      MCP_TOOL_FILE_ACTION,
      MCP_TOOL_CATALOG_ACTION,
      MCP_TOOL_SET_PREFERENCES,
      MCP_TOOL_HISTORY,
      MCP_TOOL_OPEN_NEW_WINDOW,
      MCP_TOOL_CLOSE_WINDOW,
      MCP_TOOL_FOCUS_WINDOW,
      MCP_TOOL_MINIMIZE_WINDOW,
    ]);

  function logOpenNewWindowFrontend(
    payload: McpScreenRequest,
    phase:
      | "frontend-receive"
      | "frontend-duplicate-skip"
      | "frontend-execute-start"
      | "frontend-created",
    windowLabel?: string,
  ) {
    if (payload.tool !== MCP_TOOL_OPEN_NEW_WINDOW) return;
    recordMcpOpenNewWindowDiagnostic({
      requestId: payload.id,
      phase,
      origin: "frontend",
      windowLabel,
    });
  }

    async function handleMcpActionTool(
      payload: McpScreenRequest,
      snap: UseMcpScreenBridgeInput,
    ) {
      if (payload.tool === MCP_TOOL_OPEN_NEW_WINDOW) {
        logOpenNewWindowFrontend(payload, "frontend-receive");
      }
      if (mcpActionRequestIdsInFlight.current.has(payload.id)) {
        if (payload.tool === MCP_TOOL_OPEN_NEW_WINDOW) {
          logOpenNewWindowFrontend(payload, "frontend-duplicate-skip");
        }
        return;
      }
      mcpActionRequestIdsInFlight.current.add(payload.id);
      try {
        await handleMcpActionToolBody(payload, snap);
      } finally {
        mcpActionRequestIdsInFlight.current.delete(payload.id);
      }
    }

    async function handleMcpActionToolBody(
      payload: McpScreenRequest,
      snap: UseMcpScreenBridgeInput,
    ) {
      const parsedEnvelope = parseMcpActionEnvelope(payload.arguments);
      if (!parsedEnvelope.ok) {
        await replyError(payload, parsedEnvelope.message, false);
        return;
      }
      const discardInProgress =
        parsedEnvelope.envelope.discardInProgress === true;
      const gate = assessMcpOperationGate({
        startupSettled: snap.startupSettled,
        startupRecoveryDialogOpen: snap.startupRecoveryDialogOpen,
        uiBlocking: snap.mcpUiBlocking(),
        discardInProgress,
        fileBusy: snap.fileBusy,
      });
      if (!gate.ok) {
        await replyError(payload, gate.message, discardInProgress);
        return;
      }
      if (gate.discardInProgress) {
        snap.onDiscardInProgress();
      }
      if (payload.tool === MCP_TOOL_OPEN_NEW_WINDOW) {
        logOpenNewWindowFrontend(payload, "frontend-execute-start");
      }
      const result = await executeMcpActionTool(
        payload.tool,
        parsedEnvelope.envelope,
        snap.mcpActionExecutor,
      );
      if (!result.ok) {
        await replyError(payload, result.message, discardInProgress);
        return;
      }
      if (payload.tool === MCP_TOOL_OPEN_NEW_WINDOW && result.ok) {
        logOpenNewWindowFrontend(payload, "frontend-created", result.text);
      }
      const body = mcpPlainTextToolBody(result.text, false);
      if ("tooLarge" in body) {
        await replyError(
          payload,
          "応答が大きすぎるため、渡せません。",
          discardInProgress,
        );
        return;
      }
      await reply(payload.id, payload.generation, body);
    }

    async function handleReplaceSchedule(
      payload: McpScreenRequest,
      snap: UseMcpScreenBridgeInput,
    ) {
      const gate = assessReplaceScheduleGate({
        startupSettled: snap.startupSettled,
        startupRecoveryDialogOpen: snap.startupRecoveryDialogOpen,
        uiBlocking: snap.mcpReplaceUiBlocking(),
      });
      if (!gate.ok) {
        await reply(
          payload.id,
          payload.generation,
          mcpToolErrorBody(gate.message),
          true,
        );
        return;
      }
      const parsed = parseReplaceScheduleArguments(payload.arguments);
      if (!parsed.ok) {
        await reply(
          payload.id,
          payload.generation,
          mcpToolErrorBody(parsed.message),
          true,
        );
        return;
      }
      const levelGate = assessReplaceScheduleLevelCount(
        { levels: snap.levels ?? undefined },
        parsed.document,
      );
      if (!levelGate.ok) {
        await reply(
          payload.id,
          payload.generation,
          mcpToolErrorBody(levelGate.message),
          true,
        );
        return;
      }
      const replaceResult = snap.replaceScheduleDocument(parsed.document);
      if (replaceResult.outcome === "rejected") {
        await reply(
          payload.id,
          payload.generation,
          mcpToolErrorBody(REPLACE_SCHEDULE_UI_BUSY),
          true,
        );
        return;
      }
      if (replaceResult.outcome === "applied") {
        snap.onReplaceScheduleApplied?.(replaceResult);
      }
      const diff = await loadScheduleDiffText(
        snap.getScheduleFilePath(),
        replaceResult.screenJson,
        snap.fields,
      );
      const diffText = diff.ok ? diff.text : diff.message;
      if (!diff.ok && diff.isError) {
        await reply(
          payload.id,
          payload.generation,
          mcpToolErrorBody(diffText),
        );
        return;
      }
      const capped = capReplaceScheduleDiffText(diffText);
      const body = mcpPlainTextToolBody(capped.text, false);
      if ("tooLarge" in body) {
        await reply(
          payload.id,
          payload.generation,
          mcpToolErrorBody("応答が大きすぎるため、渡せません。"),
        );
        return;
      }
      await reply(payload.id, payload.generation, body);
    }

    async function handleRequest(payload: McpScreenRequest) {
      const snap = inputRef.current;
      if (payload.tool === MCP_TOOL_REPLACE_SCHEDULE) {
        await handleReplaceSchedule(payload, snap);
        return;
      }
      if (MCP_ACTION_TOOLS.has(payload.tool)) {
        await handleMcpActionTool(payload, snap);
        return;
      }
      let toolPayload: unknown;
      const liveAnchors = liveAnchorsFromSnap(snap);
      switch (payload.tool) {
        case MCP_TOOL_SCHEDULE_DIFF: {
          const screenJson =
            snap.getCanonicalJson?.() ?? snap.scheduleCurrentJson;
          const diff = await loadScheduleDiffText(
            snap.getScheduleFilePath(),
            screenJson,
            snap.fields,
          );
          const scheduleDiffText = diff.ok ? diff.text : diff.message;
          const scheduleDiffIsError = !diff.ok && diff.isError;
          toolPayload = buildScheduleDiffPayload({
            scheduleDiffText,
            scheduleDiffIsError,
          });
          break;
        }
        case MCP_TOOL_BASELINE_DIFFS: {
          const baselineJson = snap.scheduleBaselineJson;
          const screenJson =
            snap.getCanonicalJson?.() ?? snap.scheduleCurrentJson;
          const result = await loadBaselineDiffsText(
            snap.getScheduleFilePath(),
            baselineJson,
            screenJson,
            snap.fields,
          );
          const body = mcpPlainTextToolBody(
            result.ok ? result.text : result.message,
            !result.ok && result.isError,
          );
          if ("tooLarge" in body) {
            await reply(
              payload.id,
              payload.generation,
              mcpToolErrorBody("応答が大きすぎるため、渡せません。"),
            );
            return;
          }
          await reply(payload.id, payload.generation, body);
          return;
        }
        case MCP_TOOL_SELECTED_TASK: {
          toolPayload = buildSelectedTaskPayload(
            mcpSelectedTaskPayloadInputFromSnap(snap, liveAnchors),
          );
          break;
        }
        case MCP_TOOL_SELECTED_TASKS: {
          toolPayload = buildSelectedTasksPayload(
            mcpSelectedTasksPayloadInputFromSnap(snap, liveAnchors),
          );
          break;
        }
        case MCP_TOOL_CURRENT_SCHEDULE: {
          const json = snap.getCanonicalJson?.() ?? snap.scheduleCurrentJson;
          const body = mcpPlainTextToolBody(json);
          if ("tooLarge" in body) {
            await reply(
              payload.id,
              payload.generation,
              mcpToolErrorBody("応答が大きすぎるため、渡せません。"),
            );
            return;
          }
          await reply(payload.id, payload.generation, body);
          return;
        }
        case MCP_TOOL_FILTERED_TASKS: {
          if (snap.colorsCatalogError) {
            await reply(
              payload.id,
              payload.generation,
              mcpToolErrorBody(snap.colorsCatalogError),
            );
            return;
          }
          toolPayload = buildFilteredTasksPayload(
            mcpFilteredTasksPayloadInputFromSnap(snap, liveAnchors),
          );
          break;
        }
        default:
          await reply(
            payload.id,
            payload.generation,
            mcpToolErrorBody(`未知のツールです: ${payload.tool}`),
          );
          return;
      }
      let body;
      if (isMcpReadToolName(payload.tool)) {
        let screenshot;
        try {
          snap.prepareMcpPngCapture?.();
          screenshot = await captureMainElementForMcp(snap.mainElement);
        } finally {
          snap.finalizeMcpPngCapture?.();
        }
        body = mcpReadToolsPayloadToToolBody(
          toolPayload as Record<string, unknown>,
          screenshot,
        );
      } else {
        body = mcpPayloadToToolBody(toolPayload);
      }
      if ("tooLarge" in body) {
        await reply(
          payload.id,
          payload.generation,
          mcpToolErrorBody("応答が大きすぎるため、渡せません。"),
        );
        return;
      }
      await reply(payload.id, payload.generation, body);
    }

    let unlistenInvalidated: (() => void) | undefined;
    void listen<number>("mcp-in-progress-invalidated", (event) => {
      setMcpInProgressGeneration(event.payload);
    }).then((off) => {
      unlistenInvalidated = off;
    });

    let unlisten: (() => void) | undefined;
    void listen<McpScreenRequest>(
      "mcp-screen-request",
      (event) => {
        void handleRequest(event.payload);
      },
      { target: getCurrentWindow().label },
    ).then((off) => {
      unlisten = off;
    });
    return () => {
      unlisten?.();
      unlistenInvalidated?.();
    };
  }, []);
}
