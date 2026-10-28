import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Member, MemberId } from "../model/memberTypes";
import type { StatusItem } from "../model/statusCatalog";
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
  mcpToolErrorBody,
} from "../model/screenContext";
import { isTauri } from "../model/scheduleFile";
import type {
  Category,
  Milestone,
  MilestoneGroup,
  OutlineRoot,
  ScheduleDocument,
  ScheduleFilters,
  ScheduleId,
  ScheduleFieldDef,
  ScheduleLevelDef,
} from "../model/types";

type McpScreenRequest = {
  id: string;
  generation: number;
  tool: string;
  arguments: unknown;
};

type UseMcpScreenBridgeInput = {
  categories: Category[];
  outline?: OutlineRoot | undefined;
  title: string;
  milestones: Milestone[];
  milestoneGroups: MilestoneGroup[];
  filters: ScheduleFilters;
  lineageTaskId: ScheduleId | null;
  lineageIds: ReadonlySet<ScheduleId> | null;
  hiddenMilestoneGroupIds: ScheduleId[];
  selectedTaskId: ScheduleId | null;
  selectedTaskIds: readonly ScheduleId[];
  today: string;
  memberMap: Map<MemberId, Member> | null;
  statuses: readonly StatusItem[];
  levels?: ScheduleLevelDef[] | null;
  fields?: readonly ScheduleFieldDef[] | undefined;
  scheduleFilePath: string | null;
  scheduleCurrentJson: string;
  scheduleBaselineJson: string;
  startupSettled: boolean;
  startupRecoveryDialogOpen: boolean;
  mcpReplaceUiBlocking: () => boolean;
  replaceScheduleDocument: (
    document: ScheduleDocument,
  ) => ReplaceScheduleDocumentResult;
  onReplaceScheduleApplied?: (result: ReplaceScheduleDocumentResult) => void;
};

export function useMcpScreenBridge(input: UseMcpScreenBridgeInput): void {
  const inputRef = useRef(input);
  inputRef.current = input;

  useEffect(() => {
    if (!isTauri()) return;

    async function reply(
      id: string,
      generation: number,
      body: {
        content: Array<{ type: string; text: string }>;
        isError?: boolean;
      },
    ) {
      await invoke("mcp_reply", { id, generation, body });
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
        );
        return;
      }
      const parsed = parseReplaceScheduleArguments(payload.arguments);
      if (!parsed.ok) {
        await reply(
          payload.id,
          payload.generation,
          mcpToolErrorBody(parsed.message),
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
        );
        return;
      }
      const replaceResult = snap.replaceScheduleDocument(parsed.document);
      if (replaceResult.outcome === "rejected") {
        await reply(
          payload.id,
          payload.generation,
          mcpToolErrorBody(REPLACE_SCHEDULE_UI_BUSY),
        );
        return;
      }
      if (replaceResult.outcome === "applied") {
        snap.onReplaceScheduleApplied?.(replaceResult);
      }
      const diff = await loadScheduleDiffText(
        snap.scheduleFilePath,
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
      let toolPayload: unknown;
      switch (payload.tool) {
        case MCP_TOOL_SCHEDULE_DIFF: {
          const diff = await loadScheduleDiffText(
            snap.scheduleFilePath,
            snap.scheduleCurrentJson,
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
          const screenJson = snap.scheduleCurrentJson;
          const result = await loadBaselineDiffsText(
            snap.scheduleFilePath,
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
          toolPayload = buildSelectedTaskPayload({
            categories: snap.categories,
            outline: snap.outline,
            title: snap.title,
            milestoneGroups: snap.milestoneGroups,
            milestones: snap.milestones,
            filters: snap.filters,
            today: snap.today,
            memberCatalog: snap.memberMap,
            lineageIds: snap.lineageIds,
            selectedTaskId: snap.selectedTaskId,
            statuses: snap.statuses,
            levels: snap.levels,
            fields: snap.fields,
          });
          break;
        }
        case MCP_TOOL_SELECTED_TASKS: {
          toolPayload = buildSelectedTasksPayload({
            categories: snap.categories,
            outline: snap.outline,
            title: snap.title,
            milestoneGroups: snap.milestoneGroups,
            milestones: snap.milestones,
            selectedTaskIds: snap.selectedTaskIds,
            statuses: snap.statuses,
            levels: snap.levels,
            fields: snap.fields,
          });
          break;
        }
        case MCP_TOOL_CURRENT_SCHEDULE: {
          const body = mcpPlainTextToolBody(snap.scheduleCurrentJson);
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
          toolPayload = buildFilteredTasksPayload({
            categories: snap.categories,
            outline: snap.outline,
            title: snap.title,
            filters: snap.filters,
            lineageTaskId: snap.lineageTaskId,
            hiddenMilestoneGroupIds: snap.hiddenMilestoneGroupIds,
            milestoneGroups: snap.milestoneGroups,
            milestones: snap.milestones,
            today: snap.today,
            memberCatalog: snap.memberMap,
            lineageIds: snap.lineageIds,
            statuses: snap.statuses,
            levels: snap.levels,
            fields: snap.fields,
          });
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
      const body = mcpPayloadToToolBody(toolPayload);
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
    };
  }, []);
}
