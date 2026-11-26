import { describe, expect, it } from "vitest";
import { commandPaletteCommandShortcut } from "./commandPaletteShortcuts";

describe("commandPaletteCommandShortcut", () => {
  it("shows hints for frequent navigation commands", () => {
    expect(commandPaletteCommandShortcut("settings", true)).toBe("⌘,");
    expect(commandPaletteCommandShortcut("goToday", false)).toBe("T");
    expect(commandPaletteCommandShortcut("toggleFilterPanel", false)).toBe(
      "Ctrl+Shift+F",
    );
    expect(commandPaletteCommandShortcut("tierMonth", true)).toBe("⌘+3");
    expect(commandPaletteCommandShortcut("lineage", false)).toBe("Ctrl+Shift+L");
  });
});
