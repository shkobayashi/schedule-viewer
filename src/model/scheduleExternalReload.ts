import { parseScheduleText } from "./scheduleFile";
import type { ScheduleDocument } from "./types";

export type ExternalReloadAction =
  | { kind: "noop" }
  | { kind: "apply"; canonicalJson: string; document: ScheduleDocument }
  | { kind: "confirm"; diskContents: string }
  | { kind: "invalid"; message: string; diskContents: string };

export function decideExternalReload(
  diskContents: string,
  baselineJson: string,
  isDirty: boolean,
  hasOpenEditDialog = false,
): ExternalReloadAction {
  const parsed = parseScheduleText(diskContents);
  if (!parsed.ok) {
    return { kind: "invalid", message: parsed.message, diskContents };
  }
  if (parsed.canonicalJson === baselineJson) {
    return { kind: "noop" };
  }
  if (isDirty || hasOpenEditDialog) {
    return { kind: "confirm", diskContents };
  }
  return {
    kind: "apply",
    canonicalJson: parsed.canonicalJson,
    document: parsed.document,
  };
}

/** 純粋関数が即時反映と返しても、編集中に見た差と、出ている確認は画面へ載せない。 */
export function shouldKeepExternalReloadConfirmation(input: {
  editDialogOpen: boolean;
  promptOpen: boolean;
  changeSeenWhileEditing: boolean;
}): boolean {
  return (
    input.editDialogOpen ||
    input.promptOpen ||
    input.changeSeenWhileEditing
  );
}
