import { lineagePaletteLabel, OPERATION_FORMAL } from "./operationLabels";
import { recentFileCommandPaletteLabel } from "./recentFiles";
import {
  recentMenuCommandPalettePrefix,
  recentMenuSections,
} from "./recentFilesMenu";
import type { RecentFilesStore } from "./recentFiles";

/** パレット項目 ID。`src/operations/operationIds.ts` の `COMMAND_PALETTE_OPERATION_IDS` と値を揃える。 */
export type CommandPaletteCommandId =
  | "open"
  | "clearRecentHistory"
  | "openNewWindow"
  | "save"
  | "saveAs"
  | "find"
  | "toggleFilterPanel"
  | "editTitle"
  | "showDiff"
  | "copyDiff"
  | "showJson"
  | "export"
  | "settings"
  | "guide"
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
  | "lineage"
  | "addTask"
  | "addMilestone"
  | "duplicateTask"
  | "checkForUpdates";

export type CommandPaletteItem =
  | {
      kind: "command";
      id: CommandPaletteCommandId;
      label: string;
      keywords: string;
      enabled: boolean;
    }
  | {
      kind: "openRecent";
      path: string;
      label: string;
      keywords: string;
      enabled: boolean;
    };

export type CommandPaletteRunTarget =
  | { type: "command"; id: CommandPaletteCommandId }
  | { type: "openRecent"; path: string };

export type CommandPaletteContext = {
  fileBusy: boolean;
  isTauriDesktop: boolean;
  recentFilesStore: RecentFilesStore;
  refreshRecentFiles?: () => void;
  storeDistribution: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selectedTaskId: string | null;
  selectedTaskCount: number;
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
    label: OPERATION_FORMAL.open,
    keywords: "open file ファイル",
    enabled: (ctx) => !ctx.fileBusy,
  },
  {
    id: "openNewWindow",
    label: OPERATION_FORMAL.openNewWindow,
    keywords: "open new window 別ウィンドウ",
    enabled: (ctx) => ctx.isTauriDesktop && !ctx.fileBusy,
  },
  {
    id: "save",
    label: OPERATION_FORMAL.save,
    keywords: "save",
    enabled: (ctx) => !ctx.fileBusy,
  },
  {
    id: "saveAs",
    label: OPERATION_FORMAL.saveAs,
    keywords: "save as export",
    enabled: (ctx) => !ctx.fileBusy,
  },
  {
    id: "find",
    label: OPERATION_FORMAL.searchFocus,
    keywords: "find search 検索 検索へ移る",
    enabled: () => true,
  },
  {
    id: "toggleFilterPanel",
    label: OPERATION_FORMAL.filterPanel,
    keywords: "filter 絞り込み パネル",
    enabled: () => true,
  },
  {
    id: "editTitle",
    label: OPERATION_FORMAL.editTitle,
    keywords: "title タイトル 名前",
    enabled: (ctx) => !ctx.fileBusy,
  },
  {
    id: "showDiff",
    label: OPERATION_FORMAL.showDiff,
    keywords: "diff 差分",
    enabled: (ctx) => !ctx.fileBusy,
  },
  {
    id: "copyDiff",
    label: OPERATION_FORMAL.copyDiff,
    keywords: "diff copy 差分 コピー",
    enabled: (ctx) => !ctx.fileBusy,
  },
  {
    id: "showJson",
    label: OPERATION_FORMAL.showJson,
    keywords: "json",
    enabled: () => true,
  },
  {
    id: "export",
    label: OPERATION_FORMAL.export,
    keywords: "export html svg",
    enabled: () => true,
  },
  {
    id: "settings",
    label: OPERATION_FORMAL.settings,
    keywords: "settings 設定",
    enabled: () => true,
  },
  {
    id: "checkForUpdates",
    label: OPERATION_FORMAL.checkForUpdates,
    keywords: "update 更新 確認",
    enabled: (ctx) => ctx.isTauriDesktop && !ctx.storeDistribution,
  },
  {
    id: "guide",
    label: OPERATION_FORMAL.guide,
    keywords: "guide help 案内 操作 操作の案内",
    enabled: () => true,
  },
  {
    id: "shortcuts",
    label: OPERATION_FORMAL.shortcuts,
    keywords: "shortcuts help ? f1",
    enabled: () => true,
  },
  {
    id: "goToday",
    label: OPERATION_FORMAL.goToday,
    keywords: "today 今日",
    enabled: () => true,
  },
  {
    id: "tierDay",
    label: OPERATION_FORMAL.tierDay,
    keywords: "day 日",
    enabled: () => true,
  },
  {
    id: "tierWeek",
    label: OPERATION_FORMAL.tierWeek,
    keywords: "week 週",
    enabled: () => true,
  },
  {
    id: "tierMonth",
    label: OPERATION_FORMAL.tierMonth,
    keywords: "month 月",
    enabled: () => true,
  },
  {
    id: "fit",
    label: OPERATION_FORMAL.fit,
    keywords: "fit 全体",
    enabled: () => true,
  },
  {
    id: "undo",
    label: OPERATION_FORMAL.undo,
    keywords: "undo",
    enabled: (ctx) => ctx.canUndo,
  },
  {
    id: "redo",
    label: OPERATION_FORMAL.redo,
    keywords: "redo",
    enabled: (ctx) => ctx.canRedo,
  },
  {
    id: "displayScaleIn",
    label: OPERATION_FORMAL.displayScaleIn,
    keywords: "zoom scale 拡大",
    enabled: () => true,
  },
  {
    id: "displayScaleOut",
    label: OPERATION_FORMAL.displayScaleOut,
    keywords: "zoom scale 縮小",
    enabled: () => true,
  },
  {
    id: "editTask",
    label: OPERATION_FORMAL.editTask,
    keywords: "edit 編集 enter 選択中",
    enabled: (ctx) => ctx.selectedTaskId != null && ctx.linkSourceId == null,
  },
  {
    id: "deleteTask",
    label: OPERATION_FORMAL.deleteTask,
    keywords: "delete 削除 選択中",
    enabled: (ctx) => ctx.selectedTaskCount > 0,
  },
  {
    id: "link",
    label: OPERATION_FORMAL.link,
    keywords: "link 線",
    enabled: (ctx) => ctx.selectedTaskId != null || ctx.linkSourceId != null,
  },
  {
    id: "note",
    label: OPERATION_FORMAL.note,
    keywords: "note ノート",
    enabled: (ctx) =>
      ctx.selectedTaskId != null && ctx.linkSourceId == null,
  },
  {
    id: "lineage",
    label: (ctx) => lineagePaletteLabel(ctx.lineageActive),
    keywords: "lineage 系統",
    enabled: (ctx) => ctx.selectedTaskId != null,
  },
  {
    id: "addTask",
    label: OPERATION_FORMAL.addTask,
    keywords: "add task 追加 insert",
    enabled: (ctx) => ctx.linkSourceId == null,
  },
  {
    id: "addMilestone",
    label: OPERATION_FORMAL.addMilestone,
    keywords: "add milestone マイルストン",
    enabled: (ctx) => ctx.linkSourceId == null,
  },
  {
    id: "duplicateTask",
    label: OPERATION_FORMAL.duplicateTask,
    keywords: "duplicate 複製 copy タスクを複製",
    enabled: (ctx) =>
      ctx.selectedTaskId != null && ctx.linkSourceId == null,
  },
];

function mapBaseItem(
  item: CommandPaletteTemplate,
  context: CommandPaletteContext,
): CommandPaletteItem {
  return {
    kind: "command",
    id: item.id,
    label: typeof item.label === "function" ? item.label(context) : item.label,
    keywords: item.keywords,
    enabled: item.enabled(context),
  };
}

export function buildCommandPaletteItems(
  context: CommandPaletteContext,
): CommandPaletteItem[] {
  const filtered = BASE_ITEMS.filter((item) => {
    if (item.id === "openNewWindow") {
      return context.isTauriDesktop;
    }
    if (item.id === "checkForUpdates") {
      return context.isTauriDesktop && !context.storeDistribution;
    }
    return true;
  });

  const mapped = filtered.map((item) => mapBaseItem(item, context));
  const openIndex = mapped.findIndex(
    (item) => item.kind === "command" && item.id === "open",
  );
  if (openIndex < 0) return mapped;

  const beforeOpen = mapped.slice(0, openIndex + 1);
  const afterOpen = mapped.slice(openIndex + 1);
  const openNewIndex = afterOpen.findIndex(
    (item) => item.kind === "command" && item.id === "openNewWindow",
  );
  const openNewWindow =
    openNewIndex >= 0 ? afterOpen.splice(openNewIndex, 1)[0] : null;
  const rest = afterOpen;

  const recentBlock: CommandPaletteItem[] = [];
  if (
    context.isTauriDesktop &&
    (context.recentFilesStore.schedules.length > 0 ||
      context.recentFilesStore.workspaces.length > 0)
  ) {
    for (const section of recentMenuSections(context.recentFilesStore)) {
      for (const entry of section.items) {
        const prefix = recentMenuCommandPalettePrefix(entry.kind);
        recentBlock.push({
        kind: "openRecent",
        path: entry.path,
        label: recentFileCommandPaletteLabel(`${prefix}${entry.label}`),
        keywords: `${entry.label} recent 最近 ファイル ${entry.kind}`,
        enabled: !context.fileBusy,
      });
      }
    }
    recentBlock.push({
      kind: "command",
      id: "clearRecentHistory",
      label: OPERATION_FORMAL.clearRecentHistory,
      keywords: "recent clear 履歴",
      enabled: true,
    });
  }

  const tail: CommandPaletteItem[] = [];
  if (openNewWindow) tail.push(openNewWindow);
  tail.push(...rest);
  return [...beforeOpen, ...recentBlock, ...tail];
}

export function commandPaletteItemKey(item: CommandPaletteItem): string {
  if (item.kind === "openRecent") return `recent:${item.path}`;
  return `command:${item.id}`;
}

export function commandPaletteRunTarget(
  item: CommandPaletteItem,
): CommandPaletteRunTarget | null {
  if (!item.enabled) return null;
  if (item.kind === "openRecent") {
    return { type: "openRecent", path: item.path };
  }
  return { type: "command", id: item.id };
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
