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
  return (key === "o" || key === "f") && !event.shiftKey;
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
