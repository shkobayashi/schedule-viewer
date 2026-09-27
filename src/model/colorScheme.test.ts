import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COLOR_SCHEME_LS_KEY,
  parseColorSchemePreference,
  readColorSchemePreference,
  resolveColorScheme,
  writeColorSchemePreference,
} from "./colorScheme";

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

function installMatchMedia(dark: boolean) {
  const matchMedia = vi.fn((query: string) => ({
    matches: query.includes("dark") && dark,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("matchMedia", matchMedia);
  vi.stubGlobal("window", { matchMedia });
}

afterEach(() => {
  memory.clear();
  vi.unstubAllGlobals();
});

describe("parseColorSchemePreference", () => {
  it("accepts light and dark", () => {
    expect(parseColorSchemePreference("light")).toBe("light");
    expect(parseColorSchemePreference("dark")).toBe("dark");
  });

  it("falls back to system for missing or invalid values", () => {
    expect(parseColorSchemePreference(null)).toBe("system");
    expect(parseColorSchemePreference("")).toBe("system");
    expect(parseColorSchemePreference("auto")).toBe("system");
  });
});

describe("localStorage round-trip", () => {
  it("stores fixed schemes and clears key for system", () => {
    installLocalStorage();
    writeColorSchemePreference("dark");
    expect(memory.get(COLOR_SCHEME_LS_KEY)).toBe("dark");
    expect(readColorSchemePreference()).toBe("dark");

    writeColorSchemePreference("system");
    expect(memory.has(COLOR_SCHEME_LS_KEY)).toBe(false);
    expect(readColorSchemePreference()).toBe("system");
  });
});

describe("resolveColorScheme", () => {
  it("uses OS preference when set to system", () => {
    installMatchMedia(true);
    expect(resolveColorScheme("system")).toBe("dark");
    vi.unstubAllGlobals();
    installMatchMedia(false);
    expect(resolveColorScheme("system")).toBe("light");
  });

  it("ignores OS when light or dark is chosen", () => {
    installMatchMedia(true);
    expect(resolveColorScheme("light")).toBe("light");
    expect(resolveColorScheme("dark")).toBe("dark");
  });
});
