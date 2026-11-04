import {
  applyCssPalette,
  paletteFor,
  type ResolvedColorScheme,
} from "../model/palette";

/** Experimental chrome-only directions for Issue #449 phase 2. Chart semantics stay on palette.chart. */
export type DesignDirection = "" | "linear" | "raycast" | "compact";

const DIRECTION_PARAM = "designDirection";

const VALID: DesignDirection[] = ["", "linear", "raycast", "compact"];

function parseDirection(raw: string | null): DesignDirection {
  if (raw === "linear" || raw === "raycast" || raw === "compact") return raw;
  return "";
}

export function readDesignDirectionFromLocation(): DesignDirection {
  if (typeof window === "undefined") return "";
  return parseDirection(
    new URLSearchParams(window.location.search).get(DIRECTION_PARAM),
  );
}

type CssVarOverrides = Record<string, string>;

const LINEAR_LIGHT: CssVarOverrides = {
  "--bg": "#fcfcfc",
  "--panel": "#f4f4f5",
  "--surface": "#ffffff",
  "--border": "#e4e4e7",
  "--row-border": "#ececef",
  "--text": "#18181b",
  "--text-secondary": "#71717a",
  "--accent": "#5e6ad2",
  "--accent-soft": "#eef0ff",
  "--selected-row": "#eef0ff",
  "--hover-row": "#f4f4f8",
  "--group-bg": "#f4f4f5",
  "--group-text": "#52525b",
  "--radius-sm": "4px",
  "--radius-md": "6px",
  "--radius-lg": "8px",
};

const LINEAR_DARK: CssVarOverrides = {
  "--bg": "#18181b",
  "--panel": "#27272a",
  "--surface": "#1f1f23",
  "--border": "#3f3f46",
  "--row-border": "#323238",
  "--text": "#fafafa",
  "--text-secondary": "#a1a1aa",
  "--accent": "#8b93ff",
  "--accent-soft": "#2e3148",
  "--selected-row": "#2e3148",
  "--hover-row": "#2a2a32",
  "--group-bg": "#27272a",
  "--group-text": "#d4d4d8",
  "--radius-sm": "4px",
  "--radius-md": "6px",
  "--radius-lg": "8px",
};

const RAYCAST_LIGHT: CssVarOverrides = {
  "--bg": "#ffffff",
  "--panel": "#f5f5f7",
  "--surface": "#ffffff",
  "--border": "#d1d5db",
  "--row-border": "#e5e7eb",
  "--text": "#111827",
  "--text-secondary": "#6b7280",
  "--accent": "#ff6363",
  "--accent-soft": "#ffe8e8",
  "--selected-row": "#ffe8e8",
  "--hover-row": "#fff1f1",
  "--group-bg": "#f3f4f6",
  "--group-text": "#374151",
  "--radius-sm": "6px",
  "--radius-md": "10px",
  "--radius-lg": "12px",
};

const RAYCAST_DARK: CssVarOverrides = {
  "--bg": "#1a1a1a",
  "--panel": "#252525",
  "--surface": "#202020",
  "--border": "#404040",
  "--row-border": "#333333",
  "--text": "#f5f5f5",
  "--text-secondary": "#a3a3a3",
  "--accent": "#ff7b7b",
  "--accent-soft": "#3d2828",
  "--selected-row": "#3d2828",
  "--hover-row": "#322424",
  "--group-bg": "#252525",
  "--group-text": "#d4d4d4",
  "--radius-sm": "6px",
  "--radius-md": "10px",
  "--radius-lg": "12px",
};

const COMPACT_LIGHT: CssVarOverrides = {
  "--bg": "#ffffff",
  "--panel": "#f6f7f9",
  "--surface": "#ffffff",
  "--border": "#dfe3ea",
  "--row-border": "#e8ebf0",
  "--text": "#1a1f2e",
  "--text-secondary": "#5c6578",
  "--accent": "#3b6fd9",
  "--accent-soft": "#e3ebfa",
  "--selected-row": "#e3ebfa",
  "--hover-row": "#eef3fc",
  "--group-bg": "#eef0f4",
  "--group-text": "#434a58",
  "--radius-sm": "3px",
  "--radius-md": "4px",
  "--radius-lg": "6px",
};

const COMPACT_DARK: CssVarOverrides = {
  "--bg": "#161920",
  "--panel": "#1e222c",
  "--surface": "#1a1e28",
  "--border": "#343b4a",
  "--row-border": "#2a3140",
  "--text": "#e8eaef",
  "--text-secondary": "#9aa3b2",
  "--accent": "#6b9bff",
  "--accent-soft": "#283248",
  "--selected-row": "#283248",
  "--hover-row": "#222a3a",
  "--group-bg": "#1e222c",
  "--group-text": "#b8c0cf",
  "--radius-sm": "3px",
  "--radius-md": "4px",
  "--radius-lg": "6px",
};

const TABLES: Record<
  Exclude<DesignDirection, "">,
  Record<ResolvedColorScheme, CssVarOverrides>
> = {
  linear: { light: LINEAR_LIGHT, dark: LINEAR_DARK },
  raycast: { light: RAYCAST_LIGHT, dark: RAYCAST_DARK },
  compact: { light: COMPACT_LIGHT, dark: COMPACT_DARK },
};

const DENSITY: Record<Exclude<DesignDirection, "">, string> = {
  linear: "1",
  raycast: "1",
  compact: "0.92",
};

export function applyDesignDirection(
  direction: DesignDirection,
  scheme: ResolvedColorScheme,
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  applyCssPalette(paletteFor(scheme));
  if (!direction) {
    root.removeAttribute("data-design-direction");
    root.style.removeProperty("--design-density");
    return;
  }
  root.dataset.designDirection = direction;
  root.style.setProperty("--design-density", DENSITY[direction]);
  const overrides = TABLES[direction][scheme];
  for (const [key, value] of Object.entries(overrides)) {
    root.style.setProperty(key, value);
  }
  const c = paletteFor(scheme).css;
  root.style.setProperty(
    "--elevation-menu",
    `0 8px 24px ${c.menuShadow}`,
  );
  root.style.setProperty(
    "--elevation-modal",
    `0 8px 24px ${c.modalShadow}`,
  );
}

export function initDesignDirectionPreview(
  getScheme: () => ResolvedColorScheme,
): () => void {
  if (!import.meta.env.DEV && import.meta.env.MODE !== "manual-screenshot") {
    return () => {};
  }
  const apply = () =>
    applyDesignDirection(readDesignDirectionFromLocation(), getScheme());
  apply();
  window.addEventListener("popstate", apply);
  return () => window.removeEventListener("popstate", apply);
}

export function designDirectionOptions(): { id: DesignDirection; label: string }[] {
  return [
    { id: "", label: "現状（ベースライン）" },
    { id: "linear", label: "A: Linear 寄り" },
    { id: "raycast", label: "B: Raycast 寄り" },
    { id: "compact", label: "C: 中間・高密度" },
  ];
}

export { VALID as DESIGN_DIRECTION_IDS };
