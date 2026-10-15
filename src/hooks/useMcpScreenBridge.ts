import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Member, MemberId } from "../model/memberTypes";
import { loadScheduleDiffText } from "../model/scheduleDiffLoad";
import {
  buildFilteredTasksPayload,
  buildScheduleDiffPayload,
  buildSelectedTaskPayload,
  buildSelectedTasksPayload,
  MCP_TOOL_FILTERED_TASKS,
  MCP_TOOL_SCHEDULE_DIFF,
  MCP_TOOL_SELECTED_TASK,
  MCP_TOOL_SELECTED_TASKS,
  mcpPayloadToToolBody,
  mcpToolErrorBody,
} from "../model/screenContext";
import { isTauri } from "../model/scheduleFile";
import type {
  Category,
  Milestone,
  MilestoneGroup,
  ScheduleFilters,
  ScheduleId,
} from "../model/types";

type McpScreenRequest = {
  id: string;
  generation: number;
  tool: string;
  arguments: unknown;
};

type UseMcpScreenBridgeInput = {
  categories: Category[];
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
  scheduleFilePath: string | null;
  scheduleCurrentJson: string;
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

    async function handleRequest(payload: McpScreenRequest) {
      const snap = inputRef.current;
      let toolPayload: unknown;
      switch (payload.tool) {
        case MCP_TOOL_SCHEDULE_DIFF: {
          const diff = await loadScheduleDiffText(
            snap.scheduleFilePath,
            snap.scheduleCurrentJson,
          );
          const scheduleDiffText = diff.ok ? diff.text : diff.message;
          const scheduleDiffIsError = !diff.ok && diff.isError;
          toolPayload = buildScheduleDiffPayload({
            scheduleDiffText,
            scheduleDiffIsError,
          });
          break;
        }
        case MCP_TOOL_SELECTED_TASK: {
          toolPayload = buildSelectedTaskPayload({
            categories: snap.categories,
            filters: snap.filters,
            today: snap.today,
            memberCatalog: snap.memberMap,
            lineageIds: snap.lineageIds,
            selectedTaskId: snap.selectedTaskId,
          });
          break;
        }
        case MCP_TOOL_SELECTED_TASKS: {
          toolPayload = buildSelectedTasksPayload({
            categories: snap.categories,
            selectedTaskIds: snap.selectedTaskIds,
          });
          break;
        }
        case MCP_TOOL_FILTERED_TASKS: {
          toolPayload = buildFilteredTasksPayload({
            categories: snap.categories,
            filters: snap.filters,
            lineageTaskId: snap.lineageTaskId,
            hiddenMilestoneGroupIds: snap.hiddenMilestoneGroupIds,
            milestoneGroups: snap.milestoneGroups,
            milestones: snap.milestones,
            today: snap.today,
            memberCatalog: snap.memberMap,
            lineageIds: snap.lineageIds,
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
    void listen<McpScreenRequest>("mcp-screen-request", (event) => {
      void handleRequest(event.payload);
    }).then((off) => {
      unlisten = off;
    });
    return () => {
      unlisten?.();
    };
  }, []);
}
