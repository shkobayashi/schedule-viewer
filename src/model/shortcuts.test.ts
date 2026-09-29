import { describe, expect, it } from "vitest";
import {
  blocksBrowserShortcut,
  blocksEditShortcut,
  chartScrollOffset,
  fileShortcutHint,
  matchAppShortcut,
  matchChartScroll,
  usesCommandKey,
  type ShortcutContext,
  type ShortcutKeyEvent,
} from "./shortcuts";

const idle: ShortcutContext = { dialogOpen: false, blocksEditKeys: false };
const typing: ShortcutContext = { dialogOpen: false, blocksEditKeys: true };
const dialog: ShortcutContext = { dialogOpen: true, blocksEditKeys: false };

function key(
  name: string,
  mods: Partial<Pick<ShortcutKeyEvent, "ctrlKey" | "metaKey" | "shiftKey" | "altKey">> = {},
): ShortcutKeyEvent {
  return {
    key: name,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...mods,
  };
}

describe("matchAppShortcut", () => {
  it("maps save, save as, open, and find", () => {
    expect(matchAppShortcut(key("s", { ctrlKey: true }), idle)).toBe("save");
    expect(matchAppShortcut(key("S", { metaKey: true }), idle)).toBe("save");
    expect(matchAppShortcut(key("s", { ctrlKey: true, shiftKey: true }), idle)).toBe(
      "saveAs",
    );
    expect(matchAppShortcut(key("o", { ctrlKey: true }), idle)).toBe("open");
    expect(matchAppShortcut(key("f", { metaKey: true }), idle)).toBe("find");
  });

  it("keeps file shortcuts while typing and drops them in a dialog", () => {
    expect(matchAppShortcut(key("s", { ctrlKey: true }), typing)).toBe("save");
    expect(matchAppShortcut(key("s", { ctrlKey: true, shiftKey: true }), typing)).toBe(
      "saveAs",
    );
    expect(matchAppShortcut(key("o", { ctrlKey: true }), typing)).toBe("open");
    expect(matchAppShortcut(key("f", { ctrlKey: true }), typing)).toBe("find");
    expect(matchAppShortcut(key("s", { ctrlKey: true }), dialog)).toBeNull();
    expect(matchAppShortcut(key("o", { metaKey: true }), dialog)).toBeNull();
    expect(matchAppShortcut(key("f", { ctrlKey: true }), dialog)).toBeNull();
  });

  it("maps Enter and Delete only when edit keys are free", () => {
    expect(matchAppShortcut(key("Enter"), idle)).toBe("edit");
    expect(matchAppShortcut(key("Delete"), idle)).toBe("delete");
    expect(matchAppShortcut(key("Backspace"), idle)).toBe("delete");
    expect(matchAppShortcut(key("Enter"), typing)).toBeNull();
    expect(matchAppShortcut(key("Delete"), typing)).toBeNull();
    expect(matchAppShortcut(key("Backspace"), dialog)).toBeNull();
  });

  it("ignores undo, zoom-like modifiers, and alt combinations", () => {
    expect(matchAppShortcut(key("z", { ctrlKey: true }), idle)).toBeNull();
    expect(matchAppShortcut(key("y", { ctrlKey: true }), idle)).toBeNull();
    expect(matchAppShortcut(key("s", { ctrlKey: true, altKey: true }), idle)).toBeNull();
    expect(matchAppShortcut(key("Enter", { ctrlKey: true }), idle)).toBeNull();
    expect(matchAppShortcut(key("Enter", { shiftKey: true }), idle)).toBeNull();
    expect(matchAppShortcut(key("o", { ctrlKey: true, shiftKey: true }), idle)).toBeNull();
  });
});

describe("matchChartScroll", () => {
  it("scrolls one row with ctrl or meta and an arrow", () => {
    expect(matchChartScroll(key("ArrowUp", { ctrlKey: true }), idle)).toBe("up");
    expect(matchChartScroll(key("ArrowDown", { metaKey: true }), idle)).toBe("down");
    expect(matchChartScroll(key("ArrowLeft", { ctrlKey: true }), idle)).toBe("left");
    expect(matchChartScroll(key("ArrowRight", { metaKey: true }), idle)).toBe("right");
    expect(chartScrollOffset("up", 32)).toEqual({ x: 0, y: -32 });
    expect(chartScrollOffset("down", 32)).toEqual({ x: 0, y: 32 });
    expect(chartScrollOffset("left", 32)).toEqual({ x: -32, y: 0 });
    expect(chartScrollOffset("right", 32)).toEqual({ x: 32, y: 0 });
  });

  it("scrolls while an edit key target is focused", () => {
    expect(matchChartScroll(key("ArrowDown", { ctrlKey: true }), typing)).toBe("down");
    expect(matchChartScroll(key("ArrowRight", { metaKey: true }), typing)).toBe("right");
  });

  it("does not scroll for a bare arrow, shift, alt, or a dialog", () => {
    expect(matchChartScroll(key("ArrowDown"), idle)).toBeNull();
    expect(matchChartScroll(key("ArrowLeft", { shiftKey: true }), idle)).toBeNull();
    expect(
      matchChartScroll(key("ArrowRight", { ctrlKey: true, shiftKey: true }), idle),
    ).toBeNull();
    expect(
      matchChartScroll(key("ArrowUp", { metaKey: true, altKey: true }), idle),
    ).toBeNull();
    expect(matchChartScroll(key("ArrowDown", { ctrlKey: true }), dialog)).toBeNull();
    expect(matchChartScroll(key("Enter", { ctrlKey: true }), idle)).toBeNull();
  });

  it("scrolls when both ctrl and meta are held", () => {
    expect(
      matchChartScroll(key("ArrowLeft", { ctrlKey: true, metaKey: true }), idle),
    ).toBe("left");
  });
});

describe("blocksBrowserShortcut", () => {
  it("marks save, open, and find so the browser action can be cancelled", () => {
    expect(blocksBrowserShortcut(key("s", { ctrlKey: true }))).toBe(true);
    expect(blocksBrowserShortcut(key("S", { metaKey: true, shiftKey: true }))).toBe(
      true,
    );
    expect(blocksBrowserShortcut(key("o", { ctrlKey: true }))).toBe(true);
    expect(blocksBrowserShortcut(key("f", { metaKey: true }))).toBe(true);
    expect(blocksBrowserShortcut(key("s", { ctrlKey: true, altKey: true }))).toBe(
      false,
    );
    expect(blocksBrowserShortcut(key("o", { ctrlKey: true, shiftKey: true }))).toBe(
      false,
    );
    expect(blocksBrowserShortcut(key("z", { ctrlKey: true }))).toBe(false);
    expect(blocksBrowserShortcut(key("Enter"))).toBe(false);
  });
});

describe("blocksEditShortcut", () => {
  it("blocks text fields, buttons, and links", () => {
    expect(blocksEditShortcut({ tagName: "INPUT", isContentEditable: false })).toBe(
      true,
    );
    expect(blocksEditShortcut({ tagName: "TEXTAREA", isContentEditable: false })).toBe(
      true,
    );
    expect(blocksEditShortcut({ tagName: "SELECT", isContentEditable: false })).toBe(
      true,
    );
    expect(blocksEditShortcut({ tagName: "BUTTON", isContentEditable: false })).toBe(
      true,
    );
    expect(blocksEditShortcut({ tagName: "A", isContentEditable: false })).toBe(true);
    expect(blocksEditShortcut({ tagName: "DIV", isContentEditable: true })).toBe(true);
    expect(blocksEditShortcut({ tagName: "DIV", isContentEditable: false })).toBe(
      false,
    );
  });
});

describe("fileShortcutHint", () => {
  it("uses the command key on Apple platforms", () => {
    expect(usesCommandKey("MacIntel")).toBe(true);
    expect(usesCommandKey("iPhone")).toBe(true);
    expect(usesCommandKey("Win32")).toBe(false);
    expect(usesCommandKey("Linux x86_64")).toBe(false);
    expect(fileShortcutHint("open", true)).toBe("⌘O");
    expect(fileShortcutHint("save", true)).toBe("⌘S");
    expect(fileShortcutHint("saveAs", true)).toBe("⌘⇧S");
    expect(fileShortcutHint("open", false)).toBe("Ctrl+O");
    expect(fileShortcutHint("save", false)).toBe("Ctrl+S");
    expect(fileShortcutHint("saveAs", false)).toBe("Ctrl+Shift+S");
  });
});
