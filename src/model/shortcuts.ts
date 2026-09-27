export type AppShortcut =
  | "save"
  | "saveAs"
  | "open"
  | "find"
  | "edit"
  | "delete";

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
};

const EDIT_BLOCK_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"]);

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

export function blocksBrowserShortcut(event: ShortcutKeyEvent): boolean {
  if (event.altKey) return false;
  const key = shortcutKey(event);
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return false;
  if (key === "s") return true;
  return (key === "o" || key === "f") && !event.shiftKey;
}

export function matchAppShortcut(
  event: ShortcutKeyEvent,
  context: ShortcutContext,
): AppShortcut | null {
  if (context.dialogOpen || event.altKey) return null;
  const key = shortcutKey(event);

  if (blocksBrowserShortcut(event)) {
    if (key === "s" && event.shiftKey) return "saveAs";
    if (key === "s") return "save";
    if (key === "o") return "open";
    return "find";
  }

  if (event.ctrlKey || event.metaKey || event.shiftKey || context.blocksEditKeys) {
    return null;
  }
  if (key === "Enter") return "edit";
  if (key === "Delete" || key === "Backspace") return "delete";
  return null;
}

export function usesCommandKey(platform: string): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(platform);
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
