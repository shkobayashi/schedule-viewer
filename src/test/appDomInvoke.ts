import { dirname } from "node:path";
import { vi } from "vitest";
import type { ScheduleDocument } from "../model/types";
import { parseWorkspaceText } from "../model/workspaceJson";
import { resolveWorkspaceRelativePath } from "../model/workspacePath";
import { createFileSaveFlowInvoke, type FileSaveFlowInvoke } from "./fileSaveFlowInvoke";
import type { ScheduleFileTauriInvoke } from "./scheduleFileFlowInvoke";

export type AppDomInvoke = FileSaveFlowInvoke & {
  writeCalls: Array<{ command: string; args: Record<string, unknown> | undefined }>;
  onWorkspaceReload: (workspacePath: string) => void;
  setOnWorkspaceReload: (handler: (workspacePath: string) => void) => void;
};

function readWorkspaceJson(diskStore: Map<string, string>, workspacePath: string) {
  const text = diskStore.get(workspacePath);
  if (text == null) throw new Error(`missing workspace: ${workspacePath}`);
  const parsed = parseWorkspaceText(text);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.document;
}

function writeWorkspaceJson(
  diskStore: Map<string, string>,
  workspacePath: string,
  document: ReturnType<typeof readWorkspaceJson>,
) {
  diskStore.set(workspacePath, `${JSON.stringify(document, null, 2)}\n`);
}

export function createAppDomInvoke(document: ScheduleDocument): AppDomInvoke {
  const base = createFileSaveFlowInvoke(document);
  const writeCalls: AppDomInvoke["writeCalls"] = [];
  let workspaceReloadHandler: (workspacePath: string) => void = () => {};

  const notifyReload = (workspacePath: string) => {
    workspaceReloadHandler(workspacePath.trim());
  };

  const invoke = vi.fn<ScheduleFileTauriInvoke>(async (command, args) => {
    writeCalls.push({ command, args: args as Record<string, unknown> | undefined });
    switch (command) {
      case "is_store_distribution":
        return false;
      case "get_executable_path":
        return "/usr/bin/schedule-viewer";
      case "json_skill_home_dirs":
        return { cursor: false, claude: false, copilot: false };
      case "write_members_at_path": {
        const path = String(args?.path ?? "");
        const contents = String(args?.contents ?? "");
        base.setDisk(path, contents);
        const workspacePath = String(args?.workspacePath ?? "");
        if (workspacePath) notifyReload(workspacePath);
        return;
      }
      case "write_field_extension_at_path": {
        const path = String(args?.path ?? "");
        const contents = String(args?.contents ?? "");
        base.setDisk(path, contents);
        const workspacePath = String(args?.workspacePath ?? "");
        if (workspacePath) notifyReload(workspacePath);
        return;
      }
      case "create_workspace_editable_field_extension": {
        const workspacePath = String(args?.workspacePath ?? "");
        const relative = String(args?.relativeFileName ?? "");
        const contents = String(args?.contents ?? "");
        const wsDoc = readWorkspaceJson(base.diskStore, workspacePath);
        if (wsDoc.editableFieldExtension != null) {
          throw new Error("編集用の拡張は既にあります。");
        }
        const target = resolveWorkspaceRelativePath(workspacePath, relative);
        if (!target) throw new Error("ファイル名が不正です。");
        if (base.diskStore.has(target)) {
          throw new Error("同じ名前のファイルが既にあります。");
        }
        base.setDisk(target, contents);
        wsDoc.editableFieldExtension = relative;
        writeWorkspaceJson(base.diskStore, workspacePath, wsDoc);
        notifyReload(workspacePath);
        return;
      }
      case "delete_workspace_editable_field_extension": {
        const workspacePath = String(args?.workspacePath ?? "");
        const wsDoc = readWorkspaceJson(base.diskStore, workspacePath);
        const relative = wsDoc.editableFieldExtension;
        if (relative == null) throw new Error("編集用の拡張はありません。");
        const target = resolveWorkspaceRelativePath(workspacePath, relative);
        if (target) base.diskStore.delete(target);
        delete wsDoc.editableFieldExtension;
        writeWorkspaceJson(base.diskStore, workspacePath, wsDoc);
        notifyReload(workspacePath);
        return;
      }
      case "clear_workspace_editable_field_extension": {
        const workspacePath = String(args?.workspacePath ?? "");
        const wsDoc = readWorkspaceJson(base.diskStore, workspacePath);
        delete wsDoc.editableFieldExtension;
        writeWorkspaceJson(base.diskStore, workspacePath, wsDoc);
        notifyReload(workspacePath);
        return;
      }
      case "read_json_file_limited": {
        const path = String(args?.path ?? "");
        const text = base.diskStore.get(path);
        if (text == null) throw new Error("SCHEDULE_FILE_NOT_FOUND");
        return text;
      }
      case "create_workspace_colors_catalog": {
        const workspacePath = String(args?.workspacePath ?? "");
        const relative = String(args?.relativeFileName ?? "");
        const contents = String(args?.contents ?? "");
        const wsDoc = readWorkspaceJson(base.diskStore, workspacePath);
        if (wsDoc.colors != null) throw new Error("色の一覧は既にあります。");
        const target = resolveWorkspaceRelativePath(workspacePath, relative);
        if (!target) throw new Error("ファイル名が不正です。");
        base.setDisk(target, contents);
        wsDoc.colors = relative;
        writeWorkspaceJson(base.diskStore, workspacePath, wsDoc);
        notifyReload(workspacePath);
        return;
      }
      default:
        return base.invoke(command, args);
    }
  });

  return {
    ...base,
    invoke,
    writeCalls,
    onWorkspaceReload: (workspacePath: string) => notifyReload(workspacePath),
    setOnWorkspaceReload(handler: (workspacePath: string) => void) {
      workspaceReloadHandler = handler;
    },
  };
}

export function parentDir(path: string): string {
  return dirname(path);
}
