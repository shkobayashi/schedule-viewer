import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dismissFirstRunHint,
  firstRunHintSaveFootnote,
  isFirstRunChecklistComplete,
  isFirstRunHintDismissed,
  isSaveHintCompleted,
  markFirstRunChecklistItem,
  markSaveHintCompleted,
  readFirstRunChecklist,
  saveHintLabel,
  desktopFirstRunVisibility,
  isDesktopFirstRunRuntime,
  shouldShowFirstRunHintCard,
  shouldShowSaveHintPill,
} from "./firstRunGuidance";

const memory = new Map<string, string>();

function installLocalStorage() {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  });
}

describe("firstRunGuidance persistence", () => {
  afterEach(() => {
    memory.clear();
    vi.unstubAllGlobals();
  });

  it("starts with hint not dismissed and save hint not completed", () => {
    installLocalStorage();
    expect(isFirstRunHintDismissed()).toBe(false);
    expect(isSaveHintCompleted()).toBe(false);
    expect(readFirstRunChecklist()).toEqual({
      prepareSchedule: false,
      guide: false,
      mcp: false,
    });
  });

  it("migrates legacy openFile flag to prepareSchedule", () => {
    installLocalStorage();
    memory.set(
      "schedule-viewer/first-run/checklist",
      JSON.stringify({ openFile: true, guide: false, mcp: false }),
    );
    expect(readFirstRunChecklist()).toEqual({
      prepareSchedule: true,
      guide: false,
      mcp: false,
    });
  });

  it("persists hint dismissal", () => {
    installLocalStorage();
    dismissFirstRunHint();
    expect(isFirstRunHintDismissed()).toBe(true);
  });

  it("persists save hint completion", () => {
    installLocalStorage();
    markSaveHintCompleted();
    expect(isSaveHintCompleted()).toBe(true);
  });

  it("persists checklist items without auto-dismiss when all complete", () => {
    installLocalStorage();
    markFirstRunChecklistItem("prepareSchedule");
    markFirstRunChecklistItem("guide");
    markFirstRunChecklistItem("mcp");
    expect(isFirstRunHintDismissed()).toBe(false);
    expect(readFirstRunChecklist()).toEqual({
      prepareSchedule: true,
      guide: true,
      mcp: true,
    });
    dismissFirstRunHint();
    expect(isFirstRunHintDismissed()).toBe(true);
  });
});

describe("firstRunGuidance labels", () => {
  it("uses platform-appropriate save shortcuts", () => {
    expect(saveHintLabel(false)).toBe("保存は ☰ または Ctrl+S");
    expect(saveHintLabel(true)).toBe("保存は ☰ または ⌘S");
    expect(firstRunHintSaveFootnote(true)).toContain("⌘S");
    expect(firstRunHintSaveFootnote(false)).toContain("Ctrl+S");
  });
});

describe("isDesktopFirstRunRuntime", () => {
  it("keeps the screenshot shim on the desktop path and the browser off it", () => {
    expect(isDesktopFirstRunRuntime(false, "test")).toBe(false);
    expect(isDesktopFirstRunRuntime(false, "development")).toBe(false);
    expect(isDesktopFirstRunRuntime(false, "manual-screenshot")).toBe(true);
    expect(isDesktopFirstRunRuntime(true, "development")).toBe(true);
  });

  it("hides the card, save hint, and empty-history note outside the desktop runtime", () => {
    const browser = desktopFirstRunVisibility({
      desktopRuntime: isDesktopFirstRunRuntime(false, "development"),
      dismissed: false,
      checklist: { prepareSchedule: false, guide: false, mcp: false },
      startupSettled: true,
      saveHintCompleted: false,
      isDirty: true,
      commandKey: false,
      recentMenuEmpty: true,
    });
    expect(browser).toEqual({
      showCard: false,
      saveHint: null,
      recentEmptyHint: null,
    });
  });
});

describe("shouldShowFirstRunHintCard", () => {
  const empty = { prepareSchedule: false, guide: false, mcp: false };
  const partial = { prepareSchedule: true, guide: false, mcp: false };

  it("shows after startup until dismissed or checklist complete", () => {
    expect(
      shouldShowFirstRunHintCard({
        dismissed: false,
        startupSettled: true,
        checklist: empty,
      }),
    ).toBe(true);
    expect(
      shouldShowFirstRunHintCard({
        dismissed: false,
        startupSettled: true,
        checklist: partial,
      }),
    ).toBe(true);
    expect(
      shouldShowFirstRunHintCard({
        dismissed: true,
        startupSettled: true,
        checklist: empty,
      }),
    ).toBe(false);
    expect(
      shouldShowFirstRunHintCard({
        dismissed: false,
        startupSettled: false,
        checklist: empty,
      }),
    ).toBe(false);
    expect(
      shouldShowFirstRunHintCard({
        dismissed: false,
        startupSettled: true,
        checklist: { prepareSchedule: true, guide: true, mcp: true },
      }),
    ).toBe(true);
  });

  it("isFirstRunChecklistComplete reflects all items", () => {
    expect(isFirstRunChecklistComplete(partial)).toBe(false);
    expect(
      isFirstRunChecklistComplete({
        prepareSchedule: true,
        guide: true,
        mcp: true,
      }),
    ).toBe(true);
  });
});

describe("shouldShowSaveHintPill", () => {
  it("shows while dirty until completed", () => {
    expect(
      shouldShowSaveHintPill({
        completed: false,
        startupSettled: true,
        isDirty: true,
      }),
    ).toBe(true);
    expect(
      shouldShowSaveHintPill({
        completed: true,
        startupSettled: true,
        isDirty: true,
      }),
    ).toBe(false);
    expect(
      shouldShowSaveHintPill({
        completed: false,
        startupSettled: true,
        isDirty: false,
      }),
    ).toBe(false);
  });
});
