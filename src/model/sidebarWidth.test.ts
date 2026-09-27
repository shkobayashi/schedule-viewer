import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_LS_KEY,
  SIDEBAR_WIDTH_MIN,
  adjustSidebarWidth,
  appliedSidebarWidth,
  nudgeSidebarWidth,
  parseSidebarWidth,
  readSidebarWidth,
  resizeSidebarWidth,
  writeSidebarWidth,
} from "./sidebarWidth";

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

afterEach(() => {
  memory.clear();
  vi.unstubAllGlobals();
});

describe("parseSidebarWidth", () => {
  it("uses 190 when nothing is stored", () => {
    expect(parseSidebarWidth(null)).toBe(SIDEBAR_WIDTH_DEFAULT);
    expect(parseSidebarWidth("")).toBe(SIDEBAR_WIDTH_DEFAULT);
    expect(parseSidebarWidth("  ")).toBe(SIDEBAR_WIDTH_DEFAULT);
  });

  it("rejects values that are not numbers", () => {
    expect(parseSidebarWidth("oops")).toBe(SIDEBAR_WIDTH_DEFAULT);
    expect(parseSidebarWidth("NaN")).toBe(SIDEBAR_WIDTH_DEFAULT);
  });

  it("clamps stored widths below 140", () => {
    expect(parseSidebarWidth("100")).toBe(SIDEBAR_WIDTH_MIN);
    expect(parseSidebarWidth("-20")).toBe(SIDEBAR_WIDTH_MIN);
  });

  it("rounds to the nearest pixel", () => {
    expect(parseSidebarWidth("250.6")).toBe(251);
    expect(parseSidebarWidth("250.4")).toBe(250);
  });
});

describe("appliedSidebarWidth", () => {
  it("keeps the preferred width when the chart still fits", () => {
    expect(appliedSidebarWidth(240, 800, 1)).toBe(240);
    expect(appliedSidebarWidth(190, 800, 1.5)).toBe(190);
  });

  it("shrinks only the applied width when the window is tight", () => {
    expect(appliedSidebarWidth(300, 400, 1)).toBe(200);
    expect(appliedSidebarWidth(190, 400, 2)).toBe(100);
  });

  it("returns the preferred width before the main area is measured", () => {
    expect(appliedSidebarWidth(240, 0, 1)).toBe(240);
    expect(appliedSidebarWidth(100, 0, 1)).toBe(SIDEBAR_WIDTH_MIN);
  });
});

describe("resizeSidebarWidth", () => {
  it("stays inside the minimum and the chart floor", () => {
    expect(resizeSidebarWidth(100, 800, 1)).toBe(SIDEBAR_WIDTH_MIN);
    expect(resizeSidebarWidth(700, 500, 1)).toBe(300);
    expect(resizeSidebarWidth(250.2, 800, 1)).toBe(250);
  });

  it("does not replace the preferred width when the minimum cannot fit", () => {
    expect(resizeSidebarWidth(220, 300, 1)).toBe(220);
  });
});

describe("adjustSidebarWidth", () => {
  it("shrinks from the requested width", () => {
    expect(adjustSidebarWidth(300, 180, 400, 1)).toBe(180);
  });

  it("keeps the preferred width when a drag cannot move the edge", () => {
    expect(adjustSidebarWidth(300, 250, 400, 1)).toBe(300);
    expect(adjustSidebarWidth(190, 100, 400, 2)).toBe(190);
  });
});

describe("nudgeSidebarWidth", () => {
  it("shrinks from the visible width", () => {
    expect(nudgeSidebarWidth(300, -8, 400, 1)).toBe(192);
  });

  it("grows from the visible width when the chart has room", () => {
    expect(nudgeSidebarWidth(180, 8, 800, 1)).toBe(188);
  });

  it("keeps the preferred width when a key cannot move the edge", () => {
    expect(nudgeSidebarWidth(300, 8, 400, 1)).toBe(300);
    expect(nudgeSidebarWidth(190, -8, 400, 2)).toBe(190);
  });
});

describe("sidebar width persistence", () => {
  it("stores a custom width and clears the key at the default", () => {
    installLocalStorage();
    writeSidebarWidth(240);
    expect(memory.get(SIDEBAR_WIDTH_LS_KEY)).toBe("240");
    expect(readSidebarWidth()).toBe(240);
    writeSidebarWidth(SIDEBAR_WIDTH_DEFAULT);
    expect(memory.has(SIDEBAR_WIDTH_LS_KEY)).toBe(false);
    expect(readSidebarWidth()).toBe(SIDEBAR_WIDTH_DEFAULT);
  });

  it("ignores localStorage failures", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("nope");
      },
      setItem: () => {
        throw new Error("nope");
      },
      removeItem: () => {
        throw new Error("nope");
      },
    });
    expect(readSidebarWidth()).toBe(SIDEBAR_WIDTH_DEFAULT);
    expect(() => writeSidebarWidth(240)).not.toThrow();
  });
});
