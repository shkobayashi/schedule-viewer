import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTO_UPDATE_LS_KEY,
  parseAutoUpdateEnabled,
  readAutoUpdateEnabled,
  classifyUpdateCheckError,
  manualUpdateCheckInfoMessage,
  shouldAcceptAutoUpdate,
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
    expect(
      shouldIgnoreUpdateCheckError(
        "Could not fetch a valid release JSON from the remote",
      ),
    ).toBe(true);
  });

  it("does not ignore network failures", () => {
    expect(shouldIgnoreUpdateCheckError("network error")).toBe(false);
    expect(shouldIgnoreUpdateCheckError("fetch failed")).toBe(false);
  });
});

describe("classifyUpdateCheckError", () => {
  it("marks missing platform on mac as unsupported", () => {
    expect(
      classifyUpdateCheckError(
        "the platform `darwin-aarch64` was not found in the response `platforms` object",
        true,
      ),
    ).toBe("unsupported_mac");
  });

  it("marks missing platform on other OS as fail", () => {
    expect(
      classifyUpdateCheckError(
        "the platform `linux-x86_64` was not found in the response `platforms` object",
        false,
      ),
    ).toBe("fail");
  });
});

describe("shouldAcceptAutoUpdate", () => {
  it("accepts newer stable in the same major", () => {
    expect(shouldAcceptAutoUpdate("1.4.1", "1.4.2")).toBe(true);
    expect(shouldAcceptAutoUpdate("1.4.1", "1.5.0")).toBe(true);
    expect(shouldAcceptAutoUpdate("1.4.2-beta.1", "1.4.2")).toBe(true);
  });

  it("rejects different major, beta remote, same or older", () => {
    expect(shouldAcceptAutoUpdate("1.4.1", "2.0.0")).toBe(false);
    expect(shouldAcceptAutoUpdate("1.4.1", "1.4.1-beta.1")).toBe(false);
    expect(shouldAcceptAutoUpdate("1.4.2", "1.4.2")).toBe(false);
    expect(shouldAcceptAutoUpdate("1.4.2", "1.4.1")).toBe(false);
    expect(shouldAcceptAutoUpdate("bad", "1.4.2")).toBe(false);
  });
});

describe("manualUpdateCheckInfoMessage", () => {
  it("treats release json fetch failure as fail for manual check", () => {
    expect(
      manualUpdateCheckInfoMessage(
        "Could not fetch a valid release JSON from the remote",
        false,
      ),
    ).toBe("更新の確認に失敗しました");
  });

  it("treats no update as latest for manual check", () => {
    expect(manualUpdateCheckInfoMessage("No update available", false)).toBe(
      "この版が最新です",
    );
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
