/**
 * P-CI-06 段階2: `docs/operation-entries.md` 照合用のソース由来カタログ。
 * アプリの副作用なく、import 可能なデータだけを集める。
 */
import { readFileSync } from "node:fs";
import { HAMBURGER_MENU_TAIL_ROWS, SHARED_FILE_MENU_ROWS } from "../src/model/appMenuStructure.ts";
import { buildCommandPaletteItems, type CommandPaletteContext } from "../src/model/commandPalette.ts";
import { commandPaletteCommandShortcut } from "../src/model/commandPaletteShortcuts.ts";
import type { CommandPaletteCommandId } from "../src/model/commandPalette.ts";
import { GUIDE_SECTIONS } from "../src/model/guideContent.ts";
import {
  MCP_ALL_TOOL_NAMES,
  MCP_READ_TOOL_NAMES,
  MCP_WINDOW_TARGET_TOOL_NAMES,
  mcpToolRejectsWindowArgument,
} from "../src/model/mcpToolNames.ts";
import { recentMenuCommandPalettePrefix } from "../src/model/recentFilesMenu.ts";
import { OPERATION_FORMAL, TOOLBAR_SHORT } from "../src/model/operationLabels.ts";
import { lineagePaletteLabel } from "../src/model/operationLabels.ts";
import { recentFileCommandPaletteLabel } from "../src/model/recentFiles.ts";
import {
  chartScrollShortcutHint,
  commandPaletteShortcutHint,
  confidenceToggleShortcutHint,
  diffCopyShortcutHint,
  displayScaleShortcutHint,
  fileShortcutHint,
  filterPanelShortcutHint,
  findShortcutHint,
  goTodayShortcutHint,
  lineageToggleShortcutHint,
  redoShortcutHint,
  reorderTaskShortcutHint,
  settingsShortcutHint,
  shortcutReferenceRows,
  undoShortcutHint,
  viewTierShortcutHint,
} from "../src/model/shortcuts.ts";
import {
  CONTEXT_MENU_FIXED_LABEL,
  contextMenuLabel,
} from "../src/operations/operationLabelLink.ts";
import { OPERATION_ID } from "../src/operations/operationIds.ts";

const MCP_FILE_ACTIONS = [
  "open",
  "save",
  "saveAs",
  "export",
  "exportWorkspace",
] as const;

const MCP_HISTORY_ACTIONS = ["undo", "redo"] as const;

function parseMacOSPredefinedMenuIds(): string[] {
  const text = readFileSync("src/hooks/useMacOSAppMenu.ts", "utf8");
  const ids = new Set<string>();
  for (const match of text.matchAll(
    /PredefinedMenuItem\.new\(\{\s*item:\s*"([^"]+)"/g,
  )) {
    ids.add(match[1]);
  }
  return [...ids].sort();
}

const PALETTE_TEMPLATE_IDS = [
  "open",
  "clearRecentHistory",
  "openNewWindow",
  "save",
  "saveAs",
  "find",
  "toggleFilterPanel",
  "editTitle",
  "showDiff",
  "copyDiff",
  "showJson",
  "export",
  "settings",
  "checkForUpdates",
  "guide",
  "shortcuts",
  "goToday",
  "tierDay",
  "tierWeek",
  "tierMonth",
  "fit",
  "undo",
  "redo",
  "displayScaleIn",
  "displayScaleOut",
  "editTask",
  "deleteTask",
  "link",
  "note",
  "lineage",
  "addTask",
  "addMilestone",
  "duplicateTask",
] as const satisfies readonly CommandPaletteCommandId[];

function defaultPaletteContext(
  overrides: Partial<CommandPaletteContext> = {},
): CommandPaletteContext {
  return {
    fileBusy: false,
    isTauriDesktop: true,
    recentFilesStore: {
      schedules: ["/tmp/sample/project/schedule.json"],
      workspaces: [],
    },
    storeDistribution: false,
    canUndo: true,
    canRedo: true,
    selectedTaskId: "t1",
    selectedTaskCount: 1,
    linkSourceId: null,
    lineageActive: false,
    ...overrides,
  };
}

function collectPaletteLabels(): {
  staticLabels: string[];
  labelsByCommandId: Record<string, string[]>;
  conditionalCommands: Array<{
    id: string;
    requiresTauri?: boolean;
    forbidsStore?: boolean;
    requiresRecent?: boolean;
  }>;
} {
  const labelsByCommandId: Record<string, Set<string>> = {};
  const staticLabels = new Set<string>();

  const contexts: CommandPaletteContext[] = [
    defaultPaletteContext(),
    defaultPaletteContext({ lineageActive: true }),
    defaultPaletteContext({ isTauriDesktop: false }),
    defaultPaletteContext({ storeDistribution: true }),
    defaultPaletteContext({ recentFilesStore: { schedules: [], workspaces: [] } }),
    defaultPaletteContext({ fileBusy: true }),
    defaultPaletteContext({ selectedTaskId: null, selectedTaskCount: 0 }),
    defaultPaletteContext({ linkSourceId: "t1", selectedTaskId: null }),
  ];

  for (const ctx of contexts) {
    for (const item of buildCommandPaletteItems(ctx)) {
      if (item.kind === "openRecent") {
        staticLabels.add(item.label);
        continue;
      }
      const set = labelsByCommandId[item.id] ?? new Set<string>();
      set.add(item.label);
      labelsByCommandId[item.id] = set;
      staticLabels.add(item.label);
    }
  }

  const samplePrefix = recentMenuCommandPalettePrefix("schedule");
  const openRecentLabel = recentFileCommandPaletteLabel(
    `${samplePrefix}schedule.json`,
  );
  staticLabels.add(openRecentLabel);
  staticLabels.add(OPERATION_FORMAL.clearRecentHistory);

  return {
    staticLabels: [...staticLabels].sort(),
    labelsByCommandId: Object.fromEntries(
      Object.entries(labelsByCommandId).map(([id, set]) => [id, [...set].sort()]),
    ),
    conditionalCommands: [
      { id: "openNewWindow", requiresTauri: true },
      { id: "checkForUpdates", requiresTauri: true, forbidsStore: true },
      { id: "clearRecentHistory", requiresRecent: true, requiresTauri: true },
    ],
  };
}

function collectContextMenuOutputs(): {
  fixedLabels: Record<string, string>;
  allOutputs: string[];
  templates: string[];
} {
  const allOutputs = new Set<string>();
  const ids = Object.values(OPERATION_ID);
  const contexts = [
    {},
    { tentative: true },
    { tentative: false },
    { lineageActive: true },
    { lineageActive: false },
    { levelName: "段", childName: "子" },
  ];
  for (const id of ids) {
    for (const ctx of contexts) {
      try {
        allOutputs.add(contextMenuLabel(id, ctx));
      } catch {
        // unmapped ids are not context menu operations
      }
    }
  }
  for (const label of Object.values(CONTEXT_MENU_FIXED_LABEL)) {
    if (label) allOutputs.add(label);
  }
  allOutputs.add(lineagePaletteLabel(false));
  allOutputs.add(lineagePaletteLabel(true));
  allOutputs.add("確定にする");
  allOutputs.add("未確定にする");

  return {
    fixedLabels: { ...CONTEXT_MENU_FIXED_LABEL } as Record<string, string>,
    allOutputs: [...allOutputs].sort(),
    templates: [
      "下に${levelName}を追加",
      "${childName}を追加",
      `下に${"段"}を追加`,
      `${"子"}を追加`,
    ],
  };
}

function parseExternalFeatureIds(): string[] {
  const text = readFileSync("docs/external-spec.md", "utf8");
  const ids = new Set<string>();
  for (const match of text.matchAll(/\|\s*([A-Z]+-\d+)\s*\|/g)) {
    ids.add(match[1]);
  }
  for (const match of text.matchAll(/^###\s+([A-Z]+-\d+)\s+/gm)) {
    ids.add(match[1]);
  }
  return [...ids].sort();
}

function shortcutHintCatalog(): Record<string, { mac: string; win: string }> {
  const mk = (mac: string, win: string) => ({ mac, win });
  return {
    open: mk(fileShortcutHint("open", true), fileShortcutHint("open", false)),
    openNew: mk(
      fileShortcutHint("openNew", true),
      fileShortcutHint("openNew", false),
    ),
    save: mk(fileShortcutHint("save", true), fileShortcutHint("save", false)),
    saveAs: mk(
      fileShortcutHint("saveAs", true),
      fileShortcutHint("saveAs", false),
    ),
    diffCopy: mk(
      diffCopyShortcutHint(true),
      diffCopyShortcutHint(false),
    ),
    find: mk(findShortcutHint(true), findShortcutHint(false)),
    settings: mk(
      settingsShortcutHint(true),
      settingsShortcutHint(false),
    ),
    goToday: mk(goTodayShortcutHint(), goTodayShortcutHint()),
    tierDay: mk(
      viewTierShortcutHint("day", true),
      viewTierShortcutHint("day", false),
    ),
    tierWeek: mk(
      viewTierShortcutHint("week", true),
      viewTierShortcutHint("week", false),
    ),
    tierMonth: mk(
      viewTierShortcutHint("month", true),
      viewTierShortcutHint("month", false),
    ),
    fit: mk(
      viewTierShortcutHint("fit", true),
      viewTierShortcutHint("fit", false),
    ),
    filterPanel: mk(
      filterPanelShortcutHint(true),
      filterPanelShortcutHint(false),
    ),
    lineage: mk(
      lineageToggleShortcutHint(true),
      lineageToggleShortcutHint(false),
    ),
    confidence: mk(
      confidenceToggleShortcutHint(true),
      confidenceToggleShortcutHint(false),
    ),
    undo: mk(undoShortcutHint(true), undoShortcutHint(false)),
    redo: mk(redoShortcutHint(true), redoShortcutHint(false)),
    displayScaleIn: mk("⌘+ / ⌘=", "Ctrl+ / Ctrl="),
    displayScaleOut: mk(
      displayScaleShortcutHint(true).split(" / ")[1] ?? "⌘−",
      displayScaleShortcutHint(false),
    ),
    chartScroll: mk(
      chartScrollShortcutHint(true),
      chartScrollShortcutHint(false),
    ),
    commandPalette: mk(
      commandPaletteShortcutHint(true),
      commandPaletteShortcutHint(false),
    ),
    reorder: mk(reorderTaskShortcutHint(), reorderTaskShortcutHint()),
    wheelZoomMac: mk("⌘+ホイール", "⌘+ホイール"),
    wheelZoomWin: mk("Ctrl+ホイール", "Ctrl+ホイール"),
    wheelShift: mk("Shift+ホイール", "Shift+ホイール"),
  };
}

function paletteShortcutByCommandId(): Record<
  string,
  { mac: string | null; win: string | null }
> {
  const out: Record<string, { mac: string | null; win: string | null }> = {};
  for (const id of PALETTE_TEMPLATE_IDS) {
    out[id] = {
      mac: commandPaletteCommandShortcut(id, true),
      win: commandPaletteCommandShortcut(id, false),
    };
  }
  return out;
}

export type OperationEntryCatalog = ReturnType<typeof buildOperationEntryCatalog>;

export function buildOperationEntryCatalog() {
  const palette = collectPaletteLabels();
  const contextMenu = collectContextMenuOutputs();

  const sharedFileMenuLabels = SHARED_FILE_MENU_ROWS.filter(
    (row): row is Extract<typeof row, { kind: "action" }> => row.kind === "action",
  ).map((row) => row.label);

  const hamburgerTailLabels = HAMBURGER_MENU_TAIL_ROWS.map((row) => row.label);

  const shortcutRefMac = shortcutReferenceRows(true);
  const shortcutRefWin = shortcutReferenceRows(false);

  return {
    operationFormal: { ...OPERATION_FORMAL },
    operationFormalValues: Object.values(OPERATION_FORMAL),
    toolbarShort: { ...TOOLBAR_SHORT },
    contextMenuFixed: contextMenu.fixedLabels,
    contextMenuOutputs: contextMenu.allOutputs,
    contextMenuTemplates: contextMenu.templates,
    paletteStaticLabels: palette.staticLabels,
    paletteLabelsByCommandId: palette.labelsByCommandId,
    paletteConditionalCommands: palette.conditionalCommands,
    paletteCommandIds: [...PALETTE_TEMPLATE_IDS],
    sharedFileMenuLabels,
    hamburgerTailLabels,
    hamburgerExtraLabels: [OPERATION_FORMAL.clearRecentHistory],
    macosPredefinedMenuIds: parseMacOSPredefinedMenuIds(),
    mcpToolNames: [...MCP_ALL_TOOL_NAMES],
    mcpReadToolNames: [...MCP_READ_TOOL_NAMES],
    mcpWindowTargetToolNames: [...MCP_WINDOW_TARGET_TOOL_NAMES],
    mcpFileActions: [...MCP_FILE_ACTIONS],
    mcpHistoryActions: [...MCP_HISTORY_ACTIONS],
    mcpToolsRejectingWindow: MCP_ALL_TOOL_NAMES.filter(
      (name) => mcpToolRejectsWindowArgument(name) != null,
    ),
    guideTexts: GUIDE_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.text),
    ),
    externalFeatureIds: parseExternalFeatureIds(),
    recentFilePaletteFactory:
      "recentFileCommandPaletteLabel(`${prefix}${entry.label}`)",
    recentFilePaletteFactoryFile: "src/model/recentFiles.ts",
    recentFileMenuLabelPattern: "サブメニュー内 `entry.label`",
    shortcutHints: shortcutHintCatalog(),
    paletteShortcutByCommandId: paletteShortcutByCommandId(),
    shortcutReferenceRows: shortcutRefMac.map((row, index) => ({
      action: row.action,
      mac: row.keys,
      win: shortcutRefWin[index]?.keys ?? row.keys,
      actionNote: row.actionNote,
    })),
    formalToPaletteCommandId: Object.fromEntries(
      PALETTE_TEMPLATE_IDS.map((id) => {
        const template = palette.labelsByCommandId[id]?.[0];
        return template ? [template, id] : [];
      }).filter((entry) => entry.length === 2),
    ) as Record<string, CommandPaletteCommandId>,
  };
}
