export type AppShortcut =
  | "save"
  | "saveAs"
  | "open"
  | "find"
  | "edit"
  | "delete"
  | "link"
  | "note";

export type ShortcutKeyEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

export type ShortcutContext = {
  dialogOpen: boolean;
  blocksEditKeys: boolean;
  /** 検索欄、入力欄、選択欄。ボタンは線を引くキーとノートのキーを止めない。 */
  blocksLinkKeys: boolean;
};

export type ChartScrollDirection = "up" | "down" | "left" | "right";

export type ChartScrollOffset = {
  x: number;
  y: number;
};

const EDIT_BLOCK_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"]);
const LINK_BLOCK_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function shortcutKey(event: ShortcutKeyEvent): string {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

export function blocksEditShortcut(target: {
  tagName: string;
  isContentEditable: boolean;
}): boolean {
  if (target.isContentEditable) return true;
  return EDIT_BLOCK_TAGS.has(target.tagName);
}

/** 線を引くキーとノートのキーは、検索欄・入力欄・選択欄と編集可能領域では効かない。 */
export function blocksLinkShortcut(target: {
  tagName: string;
  isContentEditable: boolean;
}): boolean {
  if (target.isContentEditable) return true;
  return LINK_BLOCK_TAGS.has(target.tagName);
}

export function blocksBrowserShortcut(event: ShortcutKeyEvent): boolean {
  if (event.altKey) return false;
  const key = shortcutKey(event);
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return false;
  if (key === "s") return true;
  if (key === "n") return !event.shiftKey;
  if (key === "d" && event.shiftKey) return true;
  if (key === "k" && !event.shiftKey) return true;
  return (key === "o" || key === "f") && !event.shiftKey;
}

export function commandPaletteShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘K" : "Ctrl+K";
}

/** ダイアログが開いているあいだは開かない。コマンドパレット自身は別処理。 */
export function matchOpenCommandPalette(
  event: ShortcutKeyEvent,
  context: Pick<ShortcutContext, "dialogOpen"> & { commandPaletteOpen: boolean },
): "open" | "close" | null {
  if (event.altKey || event.shiftKey) return null;
  if (!(event.ctrlKey || event.metaKey)) return null;
  if (shortcutKey(event) !== "k") return null;
  if (context.commandPaletteOpen) return "close";
  if (context.dialogOpen) return null;
  return "open";
}

/** macOS の ⌘Q。Tauri のウィンドウ close へ渡し、未保存確認は onCloseRequested が行う。 */
export function matchMacAppQuit(
  event: ShortcutKeyEvent,
  context: Pick<ShortcutContext, "dialogOpen"> & { commandPaletteOpen: boolean },
): boolean {
  if (context.dialogOpen || context.commandPaletteOpen || event.altKey || event.shiftKey) {
    return false;
  }
  if (!(event.ctrlKey || event.metaKey)) return false;
  return shortcutKey(event) === "q";
}

export function matchAppShortcut(
  event: ShortcutKeyEvent,
  context: ShortcutContext,
): AppShortcut | null {
  if (context.dialogOpen || event.altKey) return null;
  const key = shortcutKey(event);

  if (blocksBrowserShortcut(event) && key !== "n") {
    if (key === "s" && event.shiftKey) return "saveAs";
    if (key === "s") return "save";
    if (key === "o") return "open";
    return "find";
  }

  if (
    (key === "l" || key === "n") &&
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey
  ) {
    if (context.blocksLinkKeys) return null;
    return key === "l" ? "link" : "note";
  }

  if (event.ctrlKey || event.metaKey || event.shiftKey || context.blocksEditKeys) {
    return null;
  }
  if (key === "Enter") return "edit";
  if (key === "Delete" || key === "Backspace") return "delete";
  return null;
}

export type DisplayScaleDirection = "in" | "out";

/** ⌘ または Ctrl と + / = で拡大、- で縮小。Alt と、文字が `_` の押し方は対象外。 */
export function matchDisplayScale(
  event: ShortcutKeyEvent,
): DisplayScaleDirection | null {
  if (event.altKey) return null;
  if (!(event.ctrlKey || event.metaKey)) return null;
  if (event.key === "+" || event.key === "=") return "in";
  if (event.key === "-") return "out";
  return null;
}

export function matchChartScroll(
  event: ShortcutKeyEvent,
  context: Pick<ShortcutContext, "dialogOpen">,
): ChartScrollDirection | null {
  if (context.dialogOpen || event.altKey || event.shiftKey) return null;
  if (!(event.ctrlKey || event.metaKey)) return null;
  if (event.key === "ArrowUp") return "up";
  if (event.key === "ArrowDown") return "down";
  if (event.key === "ArrowLeft") return "left";
  if (event.key === "ArrowRight") return "right";
  return null;
}

export function chartScrollOffset(
  direction: ChartScrollDirection,
  stepPx: number,
): ChartScrollOffset {
  if (direction === "up") return { x: 0, y: -stepPx };
  if (direction === "down") return { x: 0, y: stepPx };
  if (direction === "left") return { x: -stepPx, y: 0 };
  return { x: stepPx, y: 0 };
}

export function usesCommandKey(platform: string): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

export function linkShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘L" : "Ctrl+L";
}

export function noteShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘N" : "Ctrl+N";
}

export function fileShortcutHint(
  action: "open" | "save" | "saveAs",
  commandKey: boolean,
): string {
  if (commandKey) {
    if (action === "open") return "⌘O";
    if (action === "save") return "⌘S";
    return "⌘⇧S";
  }
  if (action === "open") return "Ctrl+O";
  if (action === "save") return "Ctrl+S";
  return "Ctrl+Shift+S";
}

export function editShortcutHint(): string {
  return "Enter";
}

export function deleteShortcutHint(): string {
  return "Delete";
}

export function diffCopyShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘⇧D" : "Ctrl+Shift+D";
}

export function matchDiffCopy(
  event: ShortcutKeyEvent,
  context: Pick<ShortcutContext, "dialogOpen"> & { fileBusy: boolean },
): boolean {
  if (context.dialogOpen || context.fileBusy || event.altKey) return false;
  if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return false;
  return shortcutKey(event) === "d";
}

export function undoShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘Z" : "Ctrl+Z";
}

export function redoShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘⇧Z" : "Ctrl+Shift+Z / Ctrl+Y";
}

export function findShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘F" : "Ctrl+F";
}

export function displayScaleShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘+ / ⌘−" : "Ctrl+ / Ctrl−";
}

export function chartScrollShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘矢印" : "Ctrl+矢印";
}

export type ShortcutReferenceRow = {
  action: string;
  keys: string;
};

export function shortcutReferenceRows(commandKey: boolean): ShortcutReferenceRow[] {
  const mod = commandKey ? "⌘" : "Ctrl";
  return [
    { action: "開く", keys: fileShortcutHint("open", commandKey) },
    { action: "保存", keys: fileShortcutHint("save", commandKey) },
    { action: "別名保存", keys: fileShortcutHint("saveAs", commandKey) },
    { action: "検索", keys: findShortcutHint(commandKey) },
    { action: "編集", keys: editShortcutHint() },
    { action: "削除", keys: deleteShortcutHint() },
    { action: "差分をコピー", keys: diffCopyShortcutHint(commandKey) },
    { action: "線を引く", keys: linkShortcutHint(commandKey) },
    { action: "ノート", keys: noteShortcutHint(commandKey) },
    { action: "取り消し", keys: undoShortcutHint(commandKey) },
    { action: "やり直し", keys: redoShortcutHint(commandKey) },
    { action: "表示サイズ", keys: displayScaleShortcutHint(commandKey) },
    { action: "チャートのスクロール", keys: chartScrollShortcutHint(commandKey) },
    { action: "ショートカット一覧", keys: "? / F1" },
    { action: "コマンドパレット", keys: commandPaletteShortcutHint(commandKey) },
    {
      action: "ズーム",
      keys: `${mod}+ホイール（一覧の上では左端の日付を保つ）`,
    },
    { action: "横スクロール", keys: "Shift+ホイール" },
  ];
}

/** 入力欄・選択欄・ボタン・ダイアログのあいだは効かない。? と F1。 */
export function matchOpenShortcutsHelp(
  event: ShortcutKeyEvent,
  context: Pick<ShortcutContext, "dialogOpen" | "blocksEditKeys">,
): boolean {
  if (context.dialogOpen || context.blocksEditKeys) return false;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
    return false;
  }
  return event.key === "?" || event.key === "？" || event.key === "F1";
}
