import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FRESH_START_ENV_VAR,
  SCHEDULE_VIEWER_LS_PREFIX,
  applyFreshStartIfRequested,
  clearScheduleViewerLocalStorage,
  clearScheduleViewerLocalStorageEvaluateSource,
  isFreshStartAllowedBuild,
  isFreshStartEnvValue,
  listScheduleViewerLocalStorageKeys,
} from "./devFreshStart";

const memory = new Map<string, string>();

function installLocalStorage() {
  const keys: string[] = [];
  vi.stubGlobal("localStorage", {
    get length() {
      return keys.length;
    },
    key(index: number) {
      return keys[index] ?? null;
    },
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (!memory.has(key)) keys.push(key);
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
      const at = keys.indexOf(key);
      if (at >= 0) keys.splice(at, 1);
    },
  });
}

afterEach(() => {
  memory.clear();
  vi.unstubAllGlobals();
});

describe("isFreshStartEnvValue", () => {
  it("accepts 1, true, and yes", () => {
    expect(isFreshStartEnvValue("1")).toBe(true);
    expect(isFreshStartEnvValue(" true ")).toBe(true);
    expect(isFreshStartEnvValue("yes")).toBe(true);
    expect(isFreshStartEnvValue("0")).toBe(false);
  });
});

describe("clearScheduleViewerLocalStorage", () => {
  it("removes only schedule-viewer keys", () => {
    installLocalStorage();
    memory.set(`${SCHEDULE_VIEWER_LS_PREFIX}color-scheme`, "dark");
    memory.set(`${SCHEDULE_VIEWER_LS_PREFIX}first-run/hint-dismissed`, "1");
    memory.set("other-app/key", "keep");

    clearScheduleViewerLocalStorage(localStorage);

    expect(listScheduleViewerLocalStorageKeys(localStorage)).toEqual([]);
    expect(memory.get("other-app/key")).toBe("keep");
  });

  it("evaluate source runs the same clear in a mock storage", () => {
    installLocalStorage();
    memory.set(`${SCHEDULE_VIEWER_LS_PREFIX}display-scale`, "1");
    const run = new Function(
      "storage",
      "fn",
      "return fn(storage);",
    ) as (storage: Storage, fn: (s: Storage) => void) => void;
    const fn = eval(clearScheduleViewerLocalStorageEvaluateSource()) as (
      storage: Storage,
    ) => void;
    run(localStorage, fn);
    expect(listScheduleViewerLocalStorageKeys(localStorage)).toEqual([]);
  });
});

describe("applyFreshStartIfRequested", () => {
  it("clears when allowed build and env is set", () => {
    installLocalStorage();
    memory.set(`${SCHEDULE_VIEWER_LS_PREFIX}auto-update`, "on");
    const allowed = isFreshStartAllowedBuild();
    const applied = applyFreshStartIfRequested({ envValue: "1" });
    expect(applied).toBe(allowed);
    if (allowed) {
      expect(listScheduleViewerLocalStorageKeys(localStorage)).toEqual([]);
    }
  });

  it("does nothing when env is off", () => {
    installLocalStorage();
    memory.set(`${SCHEDULE_VIEWER_LS_PREFIX}color-scheme`, "light");
    expect(applyFreshStartIfRequested({ envValue: "0" })).toBe(false);
    expect(memory.size).toBe(1);
  });
});

describe("isFreshStartRequested", () => {
  it("documents the env var name", () => {
    expect(FRESH_START_ENV_VAR).toBe("SCHEDULE_VIEWER_FRESH_START");
  });
});
