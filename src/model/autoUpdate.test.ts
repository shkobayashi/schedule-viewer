import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTO_UPDATE_LS_KEY,
  parseAutoUpdateEnabled,
  readAutoUpdateEnabled,
  shouldIgnoreUpdateCheckError,
  writeAutoUpdateEnabled,
} from "./autoUpdate";

describe("parseAutoUpdateEnabled", () => {
  it("treats missing and invalid values as off", () => {
    expect(parseAutoUpdateEnabled(null)).toBe(false);
    expect(parseAutoUpdateEnabled("")).toBe(false);
    expect(parseAutoUpdateEnabled("off")).toBe(false);
    expect(parseAutoUpdateEnabled("true")).toBe(false);
  });

  it("treats on as enabled", () => {
    expect(parseAutoUpdateEnabled("on")).toBe(true);
  });
});

describe("shouldIgnoreUpdateCheckError", () => {
  it("ignores no update and missing platform entries", () => {
    expect(shouldIgnoreUpdateCheckError("No update available")).toBe(true);
    expect(
      shouldIgnoreUpdateCheckError(
        "the platform `darwin-aarch64` was not found in the response `platforms` object",
      ),
    ).toBe(true);
  });

  it("does not ignore network failures", () => {
    expect(shouldIgnoreUpdateCheckError("network error")).toBe(false);
    expect(shouldIgnoreUpdateCheckError("fetch failed")).toBe(false);
  });
});

describe("localStorage round-trip", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to off when unset", () => {
    expect(readAutoUpdateEnabled()).toBe(false);
  });

  it("writes on and removes when disabled", () => {
    writeAutoUpdateEnabled(true);
    expect(store.get(AUTO_UPDATE_LS_KEY)).toBe("on");
    expect(readAutoUpdateEnabled()).toBe(true);
    writeAutoUpdateEnabled(false);
    expect(store.has(AUTO_UPDATE_LS_KEY)).toBe(false);
    expect(readAutoUpdateEnabled()).toBe(false);
  });
});
