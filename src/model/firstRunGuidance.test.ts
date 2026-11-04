import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dismissFirstRunHint,
  firstRunHintSaveFootnote,
  isFirstRunHintDismissed,
  isSaveHintCompleted,
  markSaveHintCompleted,
  saveHintLabel,
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
});

describe("firstRunGuidance labels", () => {
  it("uses platform-appropriate save shortcuts", () => {
    expect(saveHintLabel(false)).toBe("保存は ☰ または Ctrl+S");
    expect(saveHintLabel(true)).toBe("保存は ☰ または ⌘S");
    expect(firstRunHintSaveFootnote(true)).toContain("⌘S");
    expect(firstRunHintSaveFootnote(false)).toContain("Ctrl+S");
  });
});

describe("shouldShowFirstRunHintCard", () => {
  it("shows only on sample after startup when not dismissed", () => {
    expect(
      shouldShowFirstRunHintCard({
        dismissed: false,
        startupSettled: true,
        showingSample: true,
      }),
    ).toBe(true);
    expect(
      shouldShowFirstRunHintCard({
        dismissed: true,
        startupSettled: true,
        showingSample: true,
      }),
    ).toBe(false);
    expect(
      shouldShowFirstRunHintCard({
        dismissed: false,
        startupSettled: false,
        showingSample: true,
      }),
    ).toBe(false);
    expect(
      shouldShowFirstRunHintCard({
        dismissed: false,
        startupSettled: true,
        showingSample: false,
      }),
    ).toBe(false);
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
