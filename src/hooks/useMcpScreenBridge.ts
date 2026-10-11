import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Member, MemberId } from "../model/memberTypes";
import { loadScheduleDiffText } from "../model/scheduleDiffLoad";
import type { SearchField } from "../model/scheduleFilterPersistence";
import {
  buildScreenContextPayload,
  mcpToolErrorBody,
  screenContextToMcpToolBody,
} from "../model/screenContext";
import { isTauri } from "../model/scheduleFile";
import type { Category, ScheduleFilters, ScheduleId } from "../model/types";

type McpScreenRequest = {
  id: string;
  generation: number;
  tool: string;
  arguments: unknown;
};

type UseMcpScreenBridgeInput = {
  categories: Category[];
  filters: ScheduleFilters;
  searchField: SearchField;
  lineageTaskId: ScheduleId | null;
  lineageIds: ReadonlySet<ScheduleId> | null;
  hiddenMilestoneGroupIds: ScheduleId[];
  selectedTaskId: ScheduleId | null;
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
      if (payload.tool !== "screen_context") {
        await reply(
          payload.id,
          payload.generation,
          mcpToolErrorBody(`未知のツールです: ${payload.tool}`),
        );
        return;
      }
      const diff = await loadScheduleDiffText(
        snap.scheduleFilePath,
        snap.scheduleCurrentJson,
      );
      const scheduleDiffText = diff.ok ? diff.text : diff.message;
      const scheduleDiffIsError = !diff.ok && diff.isError;
      const context = buildScreenContextPayload({
        categories: snap.categories,
        filters: snap.filters,
        searchField: snap.searchField,
        lineageTaskId: snap.lineageTaskId,
        hiddenMilestoneGroupIds: snap.hiddenMilestoneGroupIds,
        today: snap.today,
        memberCatalog: snap.memberMap,
        lineageIds: snap.lineageIds,
        selectedTaskId: snap.selectedTaskId,
        scheduleDiffText,
        scheduleDiffIsError,
      });
      const body = screenContextToMcpToolBody(context);
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
