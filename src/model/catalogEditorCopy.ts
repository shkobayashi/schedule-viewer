export type CatalogEditorKind = "member" | "status" | "color";

export type CatalogEditorCopy = {
  kind: CatalogEditorKind;
  overlayTitle: string;
  pickerLegend: string;
  pickerEmpty: string;
  newListButton: string;
  radioGroupName: string;
  copyConfirmBody: string;
  removeConfirmAria: string;
  removeConfirmLead: string;
  removeConfirmInUseExtra: string;
  appliedThis: string;
  appliedOther: string;
  appliedNone: string;
  appModeSubtitle: string;
  workspaceSubtitle: (fileLabel: string) => string;
  addItemButton: string;
  descriptionHint: string;
  instructionHint?: string;
};

export const CATALOG_EDITOR_SHARED_COPY = {
  close: "閉じる",
  copyList: "コピーして作る",
  remove: "外す",
  discardBody: "編集を保存していません。下書きを捨てますか。",
  discardConfirm: "捨てる",
  discardCancel: "やめる",
  copyConfirmConfirm: "作る",
  copyConfirmCancel: "やめる",
  discardConfirmAria: "下書きの確認",
  copyConfirmAria: "コピーの確認",
  dirtyDiscardLine: "下書きは保存しません。",
  save: "保存",
  revertEdits: "編集を戻す",
  exportJson: "JSON を書き出す",
  moveUp: "上へ",
  moveDown: "下へ",
  deleteRow: "削除",
  saveFailed: "保存に失敗しました。",
  exportFailed: "書き出しに失敗しました。",
} as const;

export const memberCatalogEditorCopy: CatalogEditorCopy = {
  kind: "member",
  overlayTitle: "メンバーの項目を編集",
  pickerLegend: "編集するカタログ",
  pickerEmpty: "取り込み済みのカタログはありません。",
  newListButton: "新しいカタログ",
  radioGroupName: "memberCatalogEdit",
  copyConfirmBody: "元のカタログには保存しません。この内容でコピーを作りますか。",
  removeConfirmAria: "カタログを外す確認",
  removeConfirmLead: "このカタログをアプリから外しますか。",
  removeConfirmInUseExtra:
    "チャートで使っているカタログです。外すと、担当の候補が無くなります。",
  appliedThis: "このウィンドウのチャートは、このカタログを使っています。",
  appliedOther: "このウィンドウのチャートは、別のカタログを使っています。",
  appliedNone: "このウィンドウのチャートは、メンバーのカタログを使っていません。",
  appModeSubtitle: "アプリに取り込んだカタログの項目を編集します。",
  workspaceSubtitle: (fileLabel) =>
    `設定ファイルのメンバー（${fileLabel}）の項目を編集します。`,
  addItemButton: "人を足す",
  descriptionHint: "この id を選ぶ担当だけを書く。表示名は書かない。",
};

export const statusCatalogEditorCopy: CatalogEditorCopy = {
  kind: "status",
  overlayTitle: "ステータス一覧の項目を編集",
  pickerLegend: "編集する一覧",
  pickerEmpty: "取り込み済みの一覧はありません。",
  newListButton: "新しい一覧",
  radioGroupName: "statusCatalogEdit",
  copyConfirmBody: "元の一覧には保存しません。この内容でコピーを作りますか。",
  removeConfirmAria: "一覧を外す確認",
  removeConfirmLead: "この一覧をアプリから外しますか。",
  removeConfirmInUseExtra:
    "チャートで使っている一覧です。外すと、組み込みの三件に戻ります。",
  appliedThis: "このウィンドウのチャートは、この一覧を使っています。",
  appliedOther: "このウィンドウのチャートは、別の一覧を使っています。",
  appliedNone: "このウィンドウのチャートは、組み込みの三件を使っています。",
  appModeSubtitle: "アプリに取り込んだ一覧の項目を編集します。",
  workspaceSubtitle: (fileLabel) =>
    `設定ファイルのステータス（${fileLabel}）の項目を編集します。`,
  addItemButton: "項目を足す",
  descriptionHint:
    "この id を選ぶ状態だけを書く。隣の項目と同じ依頼で迷いそうなときだけ、分かれ目を一文足す。扱いと色は書かない。",
  instructionHint:
    "空でよい。選んだあとに守ることだけを書く。進捗を揃える、移す前に確認する、など。状態は書かない。",
};

export const colorCatalogEditorCopy: CatalogEditorCopy = {
  kind: "color",
  overlayTitle: "色の一覧の項目を編集",
  pickerLegend: "編集する一覧",
  pickerEmpty: "取り込み済みの一覧はありません。",
  newListButton: "新しい一覧",
  radioGroupName: "colorCatalogEdit",
  copyConfirmBody: "元の一覧には保存しません。この内容でコピーを作りますか。",
  removeConfirmAria: "一覧を外す確認",
  removeConfirmLead: "この一覧をアプリから外しますか。",
  removeConfirmInUseExtra:
    "チャートで使っている一覧です。外すと、行の地は塗らなくなります。",
  appliedThis: "このウィンドウのチャートは、この一覧を使っています。",
  appliedOther: "このウィンドウのチャートは、別の一覧を使っています。",
  appliedNone: "このウィンドウのチャートは、色の一覧を使っていません。",
  appModeSubtitle: "アプリに取り込んだ一覧の項目を編集します。",
  workspaceSubtitle: (fileLabel) =>
    `設定ファイルの色（${fileLabel}）の項目を編集します。`,
  addItemButton: "項目を足す",
  descriptionHint: "この id を選ぶ状態だけを書く。色の値は書かない。",
};

export type CatalogAppliedNoteInput = {
  mode: "app" | "workspace";
  appliedCatalogId: string | null;
  editingCatalogId: string | null;
  workspaceAppliedNote: string;
};

export function catalogAppliedNote(
  copy: CatalogEditorCopy,
  input: CatalogAppliedNoteInput,
): string {
  if (input.mode === "workspace") {
    return input.workspaceAppliedNote;
  }
  if (
    input.appliedCatalogId != null &&
    input.appliedCatalogId === input.editingCatalogId
  ) {
    return copy.appliedThis;
  }
  if (input.appliedCatalogId != null) {
    return copy.appliedOther;
  }
  return copy.appliedNone;
}

export type CatalogSubtitleInput = {
  mode: "app" | "workspace";
  workspaceFileLabel: string | null;
};

export function catalogSubtitle(
  copy: CatalogEditorCopy,
  input: CatalogSubtitleInput,
): string {
  if (input.mode === "workspace") {
    return copy.workspaceSubtitle(input.workspaceFileLabel ?? "");
  }
  return copy.appModeSubtitle;
}

export type CatalogRemoveConfirmInput = {
  dirty: boolean;
  appliedCatalogId: string | null;
  editingCatalogId: string | null;
};

export function catalogRemoveConfirmLines(
  copy: CatalogEditorCopy,
  input: CatalogRemoveConfirmInput,
): string[] {
  return [
    copy.removeConfirmLead,
    ...(input.dirty ? [CATALOG_EDITOR_SHARED_COPY.dirtyDiscardLine] : []),
    ...(input.appliedCatalogId != null &&
    input.appliedCatalogId === input.editingCatalogId
      ? [copy.removeConfirmInUseExtra]
      : []),
  ];
}

export function catalogSavedMessage(catalogId: string): string {
  return `「${catalogId}」を保存しました。`;
}

export function catalogSaveErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : CATALOG_EDITOR_SHARED_COPY.saveFailed;
}

export function catalogExportResultMessage(path: string | null): string | null {
  if (path == null) return null;
  return `${path} に書き出しました。`;
}

export function catalogExportErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : CATALOG_EDITOR_SHARED_COPY.exportFailed;
}
