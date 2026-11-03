import { useMemo } from "react";
import { errorMessage } from "../model/errors";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { McpActionExecutorContext, McpActionResult } from "./mcpActionExecutor";
import type { McpActionEnvelope } from "../model/mcpOperationGate";
import { MCP_OPERATION_UI_BUSY } from "../model/mcpOperationGate";
import type { McpSetViewPatch } from "../model/mcpSetView";
import {
  mergeMcpSetViewCollapsed,
  mcpSetViewTouchesFilterState,
} from "../model/mcpSetView";
import {
  createScheduleWindowViaTauri,
  focusScheduleWindowViaTauri,
  readDroppedScheduleFileViaTauri,
} from "../model/windowSession";
import {
  parseScheduleText,
  saveScheduleAtPathViaTauri,
  checkScheduleFileChangedViaTauri,
  DISK_HASH_MISMATCH,
  resolveScheduleComparisonPath,
} from "../model/scheduleFile";
import { assessHierarchySave } from "../model/hierarchyLevelEdit";
import {
  assessFieldValuesConformanceSave,
  assessRequiredFieldValuesSave,
} from "../model/taskFields";
import type { ScheduleExportFormat } from "../model/exportHtml";
import { installJsonSkills, uninstallJsonSkills } from "../model/jsonSkills";
import { writeAutoUpdateEnabled } from "../model/autoUpdate";
import type { ReplaceScheduleDocumentResult } from "../model/replaceSchedule";
import { loadScheduleDiffText } from "../model/scheduleDiffLoad";
import { capReplaceScheduleDiffText } from "../model/replaceSchedule";
import { finalizeWindowClose } from "./useWindowSession";
import type { ScheduleDocument, ScheduleFieldDef, ScheduleId } from "../model/types";
import type { ScheduleFilters } from "../model/types";

export type UseMcpActionExecutorInput = {
  getDocument: () => ScheduleDocument;
  visibleRows: McpActionExecutorContext["visibleRows"];
  levels: readonly import("../model/types").ScheduleLevelDef[] | null | undefined;
  replaceScheduleDocument: (
    document: ScheduleDocument,
  ) => ReplaceScheduleDocumentResult;
  scheduleFilePath: string | null;
  getScheduleFilePath: () => string | null;
  fields: readonly ScheduleFieldDef[] | undefined;
  getCanonicalJson: () => string;
  documentTitle: string;
  setBaselineAfterSave: (json: string, path: string) => void;
  isDirty: boolean;
  getIsDirty: () => boolean;
  openPathWithoutDialog: (path: string, discardUnsaved: boolean) => Promise<McpActionResult>;
  getCollapsed: () => ReadonlySet<string>;
  getFilterViewState: () => {
    filters: ScheduleFilters;
    searchField: "name" | "note";
    hiddenMilestoneGroupIds: ScheduleId[];
  };
  applyPartialFilterViewState: (update: {
    filters?: ScheduleFilters;
    searchField?: "name" | "note";
    hiddenMilestoneGroupIds?: ScheduleId[];
    collapsed?: ReadonlySet<string>;
  }) => void;
  clearExplanationOnSetView: () => void;
  runExplainViewAction: (
    envelope: Record<string, unknown>,
  ) => { ok: true; text: string } | { ok: false; message: string };
  runExplainOverlayAction: (
    envelope: Record<string, unknown>,
  ) => { ok: true; text: string } | { ok: false; message: string };
  applySetViewPreferences: (patch: McpSetViewPatch) => void;
  applySetViewTimeline: (patch: McpSetViewPatch) => void;
  applyCalendarAction: (
    action: NonNullable<McpSetViewPatch["calendar"]>,
  ) => Promise<McpActionResult>;
  runExport: (
    format: ScheduleExportFormat,
    path: string,
    excelColumns?: readonly string[],
    excelFieldColumns?: readonly string[],
  ) => Promise<McpActionResult>;
  undo: () => boolean;
  redo: () => boolean;
  memberCatalogSave: (envelope: McpActionEnvelope) => Promise<McpActionResult>;
  colorCatalogSave: (envelope: McpActionEnvelope) => Promise<McpActionResult>;
  statusCatalogSave: (envelope: McpActionEnvelope) => Promise<McpActionResult>;
  fieldCatalogSave: (envelope: McpActionEnvelope) => Promise<McpActionResult>;
  exportWorkspaceToFolder: (folder: string) => Promise<McpActionResult>;
  mcpUiBlocking: () => boolean;
};

export function useMcpActionExecutor(
  input: UseMcpActionExecutorInput,
): McpActionExecutorContext {
  return useMemo(
    (): McpActionExecutorContext => ({
      levels: input.levels,
      visibleRows: input.visibleRows,
      getDocument: input.getDocument,
      applySetView: async (patch) => {
        if (mcpSetViewTouchesFilterState(patch)) {
          input.clearExplanationOnSetView();
          const current = input.getFilterViewState();
          const collapsed = mergeMcpSetViewCollapsed(input.getCollapsed(), patch);
          input.applyPartialFilterViewState({
            filters: patch.filters ?? current.filters,
            searchField: patch.searchField ?? current.searchField,
            hiddenMilestoneGroupIds:
              patch.hiddenMilestoneGroupIds ?? current.hiddenMilestoneGroupIds,
            collapsed,
          });
        }
        input.applySetViewPreferences(patch);
        input.applySetViewTimeline(patch);
        if (patch.calendar) {
          const calendarResult = await input.applyCalendarAction(patch.calendar);
          if (!calendarResult.ok) return calendarResult;
        }
        return { ok: true, text: "見方を変えました。" };
      },
      applyExplainView: async (envelope) => input.runExplainViewAction(envelope),
      applyExplainOverlay: async (envelope) =>
        input.runExplainOverlayAction(envelope),
      applyEditPlan: async (document, movedTo) => {
        const replaceResult = input.replaceScheduleDocument(document);
        if (replaceResult.outcome === "rejected") {
          return { ok: false, message: "画面の操作が途中なので、実行できません。" };
        }
        if (replaceResult.outcome === "unchanged") {
          return { ok: true, text: "計画は変わりませんでした。" };
        }
        const diff = await loadScheduleDiffText(
          input.getScheduleFilePath(),
          replaceResult.screenJson,
          input.fields,
        );
        const diffText = diff.ok ? diff.text : diff.message;
        if (!diff.ok && diff.isError) {
          return { ok: false, message: diffText };
        }
        const capped = capReplaceScheduleDiffText(diffText);
        const suffix = movedTo != null ? `\n移った先: ${movedTo}` : "";
        return { ok: true, text: capped.text + suffix };
      },
      runFileAction: async (envelope) => {
        const action = envelope.action;
        if (action === "save") {
          const path =
            typeof envelope.path === "string"
              ? envelope.path
              : await resolveScheduleComparisonPath(input.getScheduleFilePath());
          if (!path) {
            return { ok: false, message: "保存先がありません。" };
          }
          const parsed = parseScheduleText(input.getCanonicalJson());
          if (!parsed.ok) return { ok: false, message: parsed.message };
          const hierarchyGate = assessHierarchySave(parsed.document);
          if (!hierarchyGate.ok) return { ok: false, message: hierarchyGate.message };
          const requiredGate = assessRequiredFieldValuesSave(
            parsed.document,
            input.fields ?? [],
          );
          if (!requiredGate.ok) return { ok: false, message: requiredGate.message };
          const conformanceGate = assessFieldValuesConformanceSave(
            parsed.document,
            input.fields ?? [],
          );
          if (!conformanceGate.ok) {
            return { ok: false, message: conformanceGate.message };
          }
          let skipDiskHashCheck = envelope.skipExternalCheck === true;
          if (!skipDiskHashCheck && (await resolveScheduleComparisonPath(input.getScheduleFilePath())) != null) {
            const changed = await checkScheduleFileChangedViaTauri();
            if (changed) {
              const externalDecision = envelope.externalDecision;
              if (externalDecision !== "overwrite" && externalDecision !== "saveAs") {
                return { ok: false, message: DISK_HASH_MISMATCH };
              }
              skipDiskHashCheck = true;
            }
          }
          try {
            const written = await saveScheduleAtPathViaTauri(
              path,
              parsed.canonicalJson,
              skipDiskHashCheck,
            );
            input.setBaselineAfterSave(parsed.canonicalJson, written);
            return { ok: true, text: written };
          } catch (error) {
            const message = errorMessage(error, "ファイルに保存できませんでした。");
            if (message.includes(DISK_HASH_MISMATCH)) {
              return { ok: false, message: DISK_HASH_MISMATCH };
            }
            return { ok: false, message };
          }
        }
        if (action === "saveAs") {
          if (typeof envelope.path !== "string" || envelope.path.length === 0) {
            return { ok: false, message: "別名保存の path が要ります。" };
          }
          const parsed = parseScheduleText(input.getCanonicalJson());
          if (!parsed.ok) return { ok: false, message: parsed.message };
          try {
            const written = await saveScheduleAtPathViaTauri(
              envelope.path,
              parsed.canonicalJson,
              true,
            );
            input.setBaselineAfterSave(parsed.canonicalJson, written);
            return { ok: true, text: written };
          } catch (error) {
            return {
              ok: false,
              message: errorMessage(error, "ファイルに保存できませんでした。"),
            };
          }
        }
        if (action === "open") {
          if (typeof envelope.path !== "string" || envelope.path.length === 0) {
            return { ok: false, message: "開く path が要ります。" };
          }
          if (input.getIsDirty() && envelope.discardUnsaved !== true) {
            return {
              ok: false,
              message: "未保存の変更があります。discardUnsaved を true にしてください。",
            };
          }
          return input.openPathWithoutDialog(
            envelope.path,
            envelope.discardUnsaved === true,
          );
        }
        if (action === "export") {
          const format = envelope.format;
          if (format !== "html" && format !== "svg" && format !== "xlsx") {
            return { ok: false, message: "format は html、svg、xlsx だけにしてください。" };
          }
          if (typeof envelope.path !== "string" || envelope.path.length === 0) {
            return { ok: false, message: "書き出しの path が要ります。" };
          }
          return input.runExport(
            format as ScheduleExportFormat,
            envelope.path,
            Array.isArray(envelope.excelColumns)
              ? envelope.excelColumns.filter((c): c is string => typeof c === "string")
              : undefined,
            Array.isArray(envelope.excelFieldColumns)
              ? envelope.excelFieldColumns.filter(
                  (c): c is string => typeof c === "string",
                )
              : undefined,
          );
        }
        if (action === "exportWorkspace") {
          if (typeof envelope.folder !== "string" || envelope.folder.length === 0) {
            return { ok: false, message: "exportWorkspace の folder が要ります。" };
          }
          return input.exportWorkspaceToFolder(envelope.folder);
        }
        return { ok: false, message: "file_action の action が正しくありません。" };
      },
      runCatalogAction: async (envelope) => {
        const catalog = envelope.catalog;
        if (catalog === "members") return input.memberCatalogSave(envelope);
        if (catalog === "colors") return input.colorCatalogSave(envelope);
        if (catalog === "statuses") return input.statusCatalogSave(envelope);
        if (catalog === "fields") return input.fieldCatalogSave(envelope);
        return {
          ok: false,
          message: "catalog は members、colors、statuses、fields だけにしてください。",
        };
      },
      runSetPreferences: async (envelope) => {
        if (envelope.autoUpdateEnabled !== undefined) {
          if (typeof envelope.autoUpdateEnabled !== "boolean") {
            return {
              ok: false,
              message: "autoUpdateEnabled は true か false だけにしてください。",
            };
          }
          writeAutoUpdateEnabled(envelope.autoUpdateEnabled);
        }
        if (envelope.jsonSkills !== undefined) {
          const skills = envelope.jsonSkills;
          if (skills == null || typeof skills !== "object" || Array.isArray(skills)) {
            return { ok: false, message: "jsonSkills の形が正しくありません。" };
          }
          const record = skills as Record<string, unknown>;
          const mode = record.mode;
          const scope = record.scope;
          const projectFolder = record.projectFolder;
          const tools = record.tools;
          if (mode !== "install" && mode !== "uninstall") {
            return { ok: false, message: "jsonSkills.mode は install か uninstall です。" };
          }
          if (scope !== "user" && scope !== "project") {
            return { ok: false, message: "jsonSkills.scope は user か project です。" };
          }
          if (
            tools == null ||
            typeof tools !== "object" ||
            Array.isArray(tools)
          ) {
            return { ok: false, message: "jsonSkills.tools が要ります。" };
          }
          const toolRecord = tools as Record<string, unknown>;
          const selection = {
            cursor: toolRecord.cursor === true,
            claude: toolRecord.claude === true,
            copilot: toolRecord.copilot === true,
          };
          const folder =
            scope === "project"
              ? typeof projectFolder === "string"
                ? projectFolder
                : null
              : null;
          if (scope === "project" && !folder) {
            return {
              ok: false,
              message: "project のとき projectFolder が要ります。",
            };
          }
          try {
            if (mode === "install") {
              const result = await installJsonSkills({
                ...selection,
                scope,
                projectFolder: folder,
                replace: record.replace === true,
              });
              return {
                ok: true,
                text: JSON.stringify(result),
              };
            }
            const result = await uninstallJsonSkills({
              ...selection,
              scope,
              projectFolder: folder,
            });
            return { ok: true, text: JSON.stringify(result) };
          } catch (error) {
            return {
              ok: false,
              message: errorMessage(error, "JSON作成スキルを置けませんでした。"),
            };
          }
        }
        if (
          envelope.autoUpdateEnabled === undefined &&
          envelope.jsonSkills === undefined
        ) {
          return { ok: false, message: "設定を変える項目を1つ以上渡してください。" };
        }
        return { ok: true, text: "設定を変えました。" };
      },
      runHistory: async (envelope) => {
        const action = envelope.action;
        if (action === "undo") {
          if (!input.undo()) {
            return { ok: false, message: "戻せません。" };
          }
          return { ok: true, text: "1段戻しました。" };
        }
        if (action === "redo") {
          if (!input.redo()) {
            return { ok: false, message: "進められません。" };
          }
          return { ok: true, text: "1段進めました。" };
        }
        return { ok: false, message: "history の action は undo か redo です。" };
      },
      runFocusWindow: async (label) => {
        if (input.mcpUiBlocking()) {
          return { ok: false, message: MCP_OPERATION_UI_BUSY };
        }
        try {
          if (label) {
            await focusScheduleWindowViaTauri(label);
          } else {
            await getCurrentWindow().setFocus();
          }
          return { ok: true, text: "前面にしました。" };
        } catch (error) {
          return {
            ok: false,
            message:
              error instanceof Error ? error.message : "ウィンドウを前面に出せません。",
          };
        }
      },
      runOpenNewWindow: async (envelope) => {
        if (typeof envelope.path !== "string" || envelope.path.length === 0) {
          return { ok: false, message: "open_new_window の path が要ります。" };
        }
        try {
          const contents = await readDroppedScheduleFileViaTauri(envelope.path);
          const parsed = parseScheduleText(contents);
          if (!parsed.ok) return { ok: false, message: parsed.message };
          const label = await createScheduleWindowViaTauri(
            envelope.path,
            contents,
            typeof envelope.workspacePath === "string"
              ? envelope.workspacePath
              : null,
          );
          return { ok: true, text: label };
        } catch (error) {
          return {
            ok: false,
            message: errorMessage(error, "新しいウィンドウで開けません。"),
          };
        }
      },
      runCloseWindow: async (label, envelope) => {
        const targetLabel = label ?? (await getCurrentWindow().label);
        if (targetLabel !== (await getCurrentWindow().label)) {
          return {
            ok: false,
            message: "指定したウィンドウを、このウィンドウから閉じることはできません。",
          };
        }
        if (input.getIsDirty() && envelope.discardUnsaved !== true) {
          return {
            ok: false,
            message: "未保存の変更があります。discardUnsaved を true にしてください。",
          };
        }
        try {
          await finalizeWindowClose();
          return { ok: true, text: "閉じました。" };
        } catch (error) {
          return {
            ok: false,
            message: errorMessage(error, "閉じられません。"),
          };
        }
      },
      runMinimizeWindow: async (label) => {
        if (input.mcpUiBlocking()) {
          return { ok: false, message: MCP_OPERATION_UI_BUSY };
        }
        try {
          const window = label
            ? await import("@tauri-apps/api/webviewWindow").then(({ WebviewWindow }) =>
                WebviewWindow.getByLabel(label),
              )
            : getCurrentWindow();
          if (!window) {
            return { ok: false, message: "ウィンドウが見つかりません。" };
          }
          await window.minimize();
          return { ok: true, text: "最小化しました。" };
        } catch (error) {
          return {
            ok: false,
            message:
              error instanceof Error ? error.message : "最小化できません。",
          };
        }
      },
    }),
    [input],
  );
}
