import { describe, expect, it } from "vitest";
import {
  blocksBrowserShortcut,
  blocksEditShortcut,
  blocksLinkShortcut,
  chartScrollOffset,
  fileShortcutHint,
  linkShortcutHint,
  noteShortcutHint,
  matchAppShortcut,
  matchChartScroll,
  matchDisplayScale,
  matchOpenShortcutsHelp,
  usesCommandKey,
  type ShortcutContext,
  type ShortcutKeyEvent,
} from "./shortcuts";

const idle: ShortcutContext = {
  dialogOpen: false,
  blocksEditKeys: false,
  blocksLinkKeys: false,
};
const typing: ShortcutContext = {
  dialogOpen: false,
  blocksEditKeys: true,
  blocksLinkKeys: true,
};
const dialog: ShortcutContext = {
  dialogOpen: true,
  blocksEditKeys: false,
  blocksLinkKeys: false,
};
const buttonFocus: ShortcutContext = {
  dialogOpen: false,
  blocksEditKeys: true,
  blocksLinkKeys: false,
};

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

describe("matchOpenShortcutsHelp", () => {
  it("opens from ? and F1, and not while typing or in a dialog", () => {
    expect(matchOpenShortcutsHelp(key("?"), idle)).toBe(true);
    expect(matchOpenShortcutsHelp(key("？"), idle)).toBe(true);
    expect(matchOpenShortcutsHelp(key("F1"), idle)).toBe(true);
    expect(matchOpenShortcutsHelp(key("F1"), typing)).toBe(false);
    expect(matchOpenShortcutsHelp(key("F1"), dialog)).toBe(false);
    expect(matchOpenShortcutsHelp(key("F1"), buttonFocus)).toBe(false);
    expect(matchOpenShortcutsHelp(key("F1", { shiftKey: true }), idle)).toBe(false);
    expect(matchOpenShortcutsHelp(key("F1", { ctrlKey: true }), idle)).toBe(false);
  });
});

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

  it("maps command L for drawing a link unless a field or dialog has focus", () => {
    expect(matchAppShortcut(key("l", { ctrlKey: true }), idle)).toBe("link");
    expect(matchAppShortcut(key("L", { metaKey: true }), idle)).toBe("link");
    expect(matchAppShortcut(key("l", { ctrlKey: true }), buttonFocus)).toBe("link");
    expect(matchAppShortcut(key("l"), idle)).toBeNull();
    expect(matchAppShortcut(key("l", { ctrlKey: true }), typing)).toBeNull();
    expect(matchAppShortcut(key("l", { metaKey: true }), dialog)).toBeNull();
    expect(matchAppShortcut(key("l", { ctrlKey: true, shiftKey: true }), idle)).toBeNull();
    expect(matchAppShortcut(key("l", { altKey: true }), idle)).toBeNull();
    expect(matchAppShortcut(key("l", { ctrlKey: true, altKey: true }), idle)).toBeNull();
  });

  it("maps command N for the selected task note unless a field or dialog has focus", () => {
    expect(matchAppShortcut(key("n", { ctrlKey: true }), idle)).toBe("note");
    expect(matchAppShortcut(key("N", { metaKey: true }), idle)).toBe("note");
    expect(matchAppShortcut(key("n", { ctrlKey: true }), buttonFocus)).toBe("note");
    expect(matchAppShortcut(key("n"), idle)).toBeNull();
    expect(matchAppShortcut(key("n", { ctrlKey: true }), typing)).toBeNull();
    expect(matchAppShortcut(key("n", { metaKey: true }), dialog)).toBeNull();
    expect(matchAppShortcut(key("n", { ctrlKey: true, shiftKey: true }), idle)).toBeNull();
    expect(matchAppShortcut(key("n", { altKey: true }), idle)).toBeNull();
    expect(matchAppShortcut(key("n", { ctrlKey: true, altKey: true }), idle)).toBeNull();
  });

  it("ignores undo, zoom-like modifiers, and alt combinations", () => {
    expect(matchAppShortcut(key("z", { ctrlKey: true }), idle)).toBeNull();
    expect(matchAppShortcut(key("y", { ctrlKey: true }), idle)).toBeNull();
    expect(matchAppShortcut(key("s", { ctrlKey: true, altKey: true }), idle)).toBeNull();
    expect(matchAppShortcut(key("Enter", { ctrlKey: true }), idle)).toBeNull();
    expect(matchAppShortcut(key("Enter", { shiftKey: true }), idle)).toBeNull();
    expect(matchAppShortcut(key("o", { ctrlKey: true, shiftKey: true }), idle)).toBe(
      "openNew",
    );
  });
});

describe("matchDisplayScale", () => {
  it("maps plus, equals, and minus with ctrl or meta", () => {
    expect(matchDisplayScale(key("+", { ctrlKey: true }))).toBe("in");
    expect(matchDisplayScale(key("=", { metaKey: true }))).toBe("in");
    expect(matchDisplayScale(key("+", { ctrlKey: true, shiftKey: true }))).toBe("in");
    expect(matchDisplayScale(key("-", { ctrlKey: true }))).toBe("out");
    expect(matchDisplayScale(key("-", { metaKey: true }))).toBe("out");
    expect(matchDisplayScale(key("+", { ctrlKey: true, metaKey: true }))).toBe("in");
  });

  it("ignores underscore, alt, a bare key, and zero", () => {
    expect(matchDisplayScale(key("_", { ctrlKey: true, shiftKey: true }))).toBeNull();
    expect(matchDisplayScale(key("+", { ctrlKey: true, altKey: true }))).toBeNull();
    expect(matchDisplayScale(key("-", { altKey: true, metaKey: true }))).toBeNull();
    expect(matchDisplayScale(key("+"))).toBeNull();
    expect(matchDisplayScale(key("-"))).toBeNull();
    expect(matchDisplayScale(key("0", { ctrlKey: true }))).toBeNull();
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
  it("marks save, open, find, and note so the browser action can be cancelled", () => {
    expect(blocksBrowserShortcut(key("s", { ctrlKey: true }))).toBe(true);
    expect(blocksBrowserShortcut(key("n", { ctrlKey: true }))).toBe(true);
    expect(blocksBrowserShortcut(key("N", { metaKey: true }))).toBe(true);
    expect(blocksBrowserShortcut(key("n", { ctrlKey: true, shiftKey: true }))).toBe(
      false,
    );
    expect(blocksBrowserShortcut(key("n", { ctrlKey: true, altKey: true }))).toBe(
      false,
    );
    expect(blocksBrowserShortcut(key("n"))).toBe(false);
    expect(blocksBrowserShortcut(key("S", { metaKey: true, shiftKey: true }))).toBe(
      true,
    );
    expect(blocksBrowserShortcut(key("o", { ctrlKey: true }))).toBe(true);
    expect(blocksBrowserShortcut(key("f", { metaKey: true }))).toBe(true);
    expect(blocksBrowserShortcut(key("s", { ctrlKey: true, altKey: true }))).toBe(
      false,
    );
    expect(blocksBrowserShortcut(key("o", { ctrlKey: true, shiftKey: true }))).toBe(
      true,
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

describe("blocksLinkShortcut", () => {
  it("blocks fields but not buttons", () => {
    expect(blocksLinkShortcut({ tagName: "INPUT", isContentEditable: false })).toBe(
      true,
    );
    expect(blocksLinkShortcut({ tagName: "TEXTAREA", isContentEditable: false })).toBe(
      true,
    );
    expect(blocksLinkShortcut({ tagName: "SELECT", isContentEditable: false })).toBe(
      true,
    );
    expect(blocksLinkShortcut({ tagName: "BUTTON", isContentEditable: false })).toBe(
      false,
    );
    expect(blocksLinkShortcut({ tagName: "DIV", isContentEditable: true })).toBe(true);
    expect(blocksLinkShortcut({ tagName: "DIV", isContentEditable: false })).toBe(
      false,
    );
  });
});

describe("linkShortcutHint", () => {
  it("uses the command key on mac and ctrl elsewhere", () => {
    expect(linkShortcutHint(true)).toBe("⌘L");
    expect(linkShortcutHint(false)).toBe("Ctrl+L");
  });
});

describe("noteShortcutHint", () => {
  it("uses the command key for the note hint", () => {
    expect(noteShortcutHint(true)).toBe("⌘N");
    expect(noteShortcutHint(false)).toBe("Ctrl+N");
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
