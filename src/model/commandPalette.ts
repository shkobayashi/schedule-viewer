export type CommandPaletteCommandId =
  | "open"
  | "openNewWindow"
  | "save"
  | "saveAs"
  | "find"
  | "showDiff"
  | "copyDiff"
  | "showJson"
  | "export"
  | "settings"
  | "shortcuts"
  | "goToday"
  | "tierDay"
  | "tierWeek"
  | "tierMonth"
  | "fit"
  | "undo"
  | "redo"
  | "displayScaleIn"
  | "displayScaleOut"
  | "editTask"
  | "deleteTask"
  | "link"
  | "note"
  | "lineage";

export type CommandPaletteItem = {
  id: CommandPaletteCommandId;
  label: string;
  keywords: string;
  enabled: boolean;
};

export type CommandPaletteContext = {
  fileBusy: boolean;
  isTauriDesktop: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selectedTaskId: string | null;
  linkSourceId: string | null;
  lineageActive: boolean;
};

type CommandPaletteTemplate = {
  id: CommandPaletteCommandId;
  label: string | ((ctx: CommandPaletteContext) => string);
  keywords: string;
  enabled: (ctx: CommandPaletteContext) => boolean;
};

const BASE_ITEMS: CommandPaletteTemplate[] = [
  {
    id: "open",
    label: "開く",
    keywords: "open file ファイル",
    enabled: (ctx) => !ctx.fileBusy,
  },
  {
    id: "openNewWindow",
    label: "新しいウィンドウで開く",
    keywords: "open new window 別ウィンドウ",
    enabled: (ctx) => ctx.isTauriDesktop && !ctx.fileBusy,
  },
  {
    id: "save",
    label: "保存",
    keywords: "save",
    enabled: (ctx) => !ctx.fileBusy,
  },
  {
    id: "saveAs",
    label: "別名保存",
    keywords: "save as export",
    enabled: (ctx) => !ctx.fileBusy,
  },
  {
    id: "find",
    label: "検索へ移る",
    keywords: "find search 検索",
    enabled: () => true,
  },
  {
    id: "showDiff",
    label: "差分を表示",
    keywords: "diff 差分",
    enabled: (ctx) => !ctx.fileBusy,
  },
  {
    id: "copyDiff",
    label: "差分をコピー",
    keywords: "diff copy 差分 コピー",
    enabled: (ctx) => !ctx.fileBusy,
  },
  {
    id: "showJson",
    label: "JSON を表示",
    keywords: "json",
    enabled: () => true,
  },
  {
    id: "export",
    label: "書き出し",
    keywords: "export html svg",
    enabled: () => true,
  },
  {
    id: "settings",
    label: "設定",
    keywords: "settings 設定",
    enabled: () => true,
  },
  {
    id: "shortcuts",
    label: "ショートカット一覧",
    keywords: "shortcuts help ? f1",
    enabled: () => true,
  },
  {
    id: "goToday",
    label: "今日",
    keywords: "today 今日",
    enabled: () => true,
  },
  {
    id: "tierDay",
    label: "日表示",
    keywords: "day 日",
    enabled: () => true,
  },
  {
    id: "tierWeek",
    label: "週表示",
    keywords: "week 週",
    enabled: () => true,
  },
  {
    id: "tierMonth",
    label: "月表示",
    keywords: "month 月",
    enabled: () => true,
  },
  {
    id: "fit",
    label: "全体",
    keywords: "fit 全体",
    enabled: () => true,
  },
  {
    id: "undo",
    label: "取り消し",
    keywords: "undo",
    enabled: (ctx) => ctx.canUndo,
  },
  {
    id: "redo",
    label: "やり直し",
    keywords: "redo",
    enabled: (ctx) => ctx.canRedo,
  },
  {
    id: "displayScaleIn",
    label: "表示サイズを拡大",
    keywords: "zoom scale 拡大",
    enabled: () => true,
  },
  {
    id: "displayScaleOut",
    label: "表示サイズを縮小",
    keywords: "zoom scale 縮小",
    enabled: () => true,
  },
  {
    id: "editTask",
    label: "選択中のタスクを編集",
    keywords: "edit 編集 enter",
    enabled: (ctx) => ctx.selectedTaskId != null && ctx.linkSourceId == null,
  },
  {
    id: "deleteTask",
    label: "選択中のタスクを削除",
    keywords: "delete 削除",
    enabled: (ctx) => ctx.selectedTaskId != null,
  },
  {
    id: "link",
    label: "線を引く",
    keywords: "link 線",
    enabled: (ctx) => ctx.selectedTaskId != null || ctx.linkSourceId != null,
  },
  {
    id: "note",
    label: "ノート",
    keywords: "note ノート",
    enabled: (ctx) =>
      ctx.selectedTaskId != null && ctx.linkSourceId == null,
  },
  {
    id: "lineage",
    label: (ctx) => (ctx.lineageActive ? "系統を解除" : "系統を表示"),
    keywords: "lineage 系統",
    enabled: (ctx) => ctx.selectedTaskId != null,
  },
];

export function buildCommandPaletteItems(
  context: CommandPaletteContext,
): CommandPaletteItem[] {
  return BASE_ITEMS.filter(
    (item) => item.id !== "openNewWindow" || context.isTauriDesktop,
  ).map((item) => ({
    id: item.id,
    label: typeof item.label === "function" ? item.label(context) : item.label,
    keywords: item.keywords,
    enabled: item.enabled(context),
  }));
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** ラベルとキーワードへの部分一致。空クエリは全件。 */
export function filterCommandPaletteItems(
  items: CommandPaletteItem[],
  query: string,
): CommandPaletteItem[] {
  const q = normalizeQuery(query);
  if (!q) return items;
  return items.filter((item) => {
    const haystack = `${item.label} ${item.keywords}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function moveCommandPaletteHighlight(
  current: number,
  delta: number,
  length: number,
): number {
  if (length <= 0) return 0;
  const next = current + delta;
  if (next < 0) return length - 1;
  if (next >= length) return 0;
  return next;
}

export function commandPaletteActiveIndex(
  items: CommandPaletteItem[],
  highlighted: number,
): number {
  if (items.length === 0) return -1;
  const clamped = Math.max(0, Math.min(highlighted, items.length - 1));
  return clamped;
}
