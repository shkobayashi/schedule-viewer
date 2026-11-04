import {
  applyCssPalette,
  paletteFor,
  type ResolvedColorScheme,
} from "../model/palette";

/** Experimental chrome-only directions for Issue #449 phase 2. Chart semantics stay on palette.chart. */
export type DesignDirection = "" | "linear" | "raycast" | "compact";

const DIRECTION_PARAM = "designDirection";

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

export type DesignLayoutTweaks = {
  rowHeightMul: number;
  headerHeightMul: number;
  uiScaleMul: number;
};

/** Real layout multipliers (sidebar row height matches timeline). */
export function designLayoutTweaks(direction: DesignDirection): DesignLayoutTweaks {
  switch (direction) {
    case "linear":
      return { rowHeightMul: 1.14, headerHeightMul: 1.2, uiScaleMul: 1.03 };
    case "raycast":
      return { rowHeightMul: 1, headerHeightMul: 1, uiScaleMul: 1 };
    case "compact":
      return { rowHeightMul: 0.7, headerHeightMul: 0.75, uiScaleMul: 0.86 };
    default:
      return { rowHeightMul: 1, headerHeightMul: 1, uiScaleMul: 1 };
  }
}

type CssVarOverrides = Record<string, string>;

const LINEAR_LIGHT: CssVarOverrides = {
  "--bg": "#fafafa",
  "--panel": "#f0f0f2",
  "--surface": "#ffffff",
  "--border": "#d4d4d8",
  "--row-border": "transparent",
  "--text": "#18181b",
  "--text-secondary": "#71717a",
  "--accent": "#5e6ad2",
  "--accent-soft": "#e8ebff",
  "--selected-row": "#eef0ff",
  "--hover-row": "#f4f4f8",
  "--group-bg": "transparent",
  "--group-text": "#71717a",
  "--on-accent": "#ffffff",
  "--radius-sm": "4px",
  "--radius-md": "6px",
  "--radius-lg": "8px",
};

const RAYCAST_LIGHT: CssVarOverrides = {
  "--bg": "#e8e8ed",
  "--panel": "#ffffff",
  "--surface": "#2d2d2d",
  "--border": "#3f3f46",
  "--row-border": "transparent",
  "--text": "#111827",
  "--text-secondary": "#6b7280",
  "--accent": "#ff6363",
  "--accent-soft": "#ff6363",
  "--selected-row": "#ff6363",
  "--hover-row": "#fff0f0",
  "--group-bg": "#f3f4f6",
  "--group-text": "#374151",
  "--on-accent": "#ffffff",
  "--radius-sm": "8px",
  "--radius-md": "12px",
  "--radius-lg": "16px",
};

const COMPACT_LIGHT: CssVarOverrides = {
  "--bg": "#ffffff",
  "--panel": "#eef1f6",
  "--surface": "#ffffff",
  "--border": "#b8c0cc",
  "--row-border": "#d0d7e2",
  "--text": "#0f172a",
  "--text-secondary": "#64748b",
  "--accent": "#2563eb",
  "--accent-soft": "#dbeafe",
  "--selected-row": "#dbeafe",
  "--hover-row": "#fef9c3",
  "--group-bg": "#e2e8f0",
  "--group-text": "#334155",
  "--on-accent": "#ffffff",
  "--radius-sm": "2px",
  "--radius-md": "3px",
  "--radius-lg": "4px",
};

const TABLES: Record<
  Exclude<DesignDirection, "">,
  Record<ResolvedColorScheme, CssVarOverrides>
> = {
  linear: { light: LINEAR_LIGHT, dark: LINEAR_LIGHT },
  raycast: { light: RAYCAST_LIGHT, dark: RAYCAST_LIGHT },
  compact: { light: COMPACT_LIGHT, dark: COMPACT_LIGHT },
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
    return;
  }
  root.dataset.designDirection = direction;
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

export const DESIGN_DIRECTION_IDS: DesignDirection[] = [
  "",
  "linear",
  "raycast",
  "compact",
];
