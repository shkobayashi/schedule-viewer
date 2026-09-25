/** 手動の表示サイズの下限。自動は 1 未満にならない。 */
export const UI_SCALE_MIN = 0.5;
export const UI_SCALE_MAX = 2;
const AUTO_SCALE_MIN = 1;
const BASE_WIDTH = 1100;
const BASE_HEIGHT = 780;

export const DISPLAY_SCALE_LS_KEY = "schedule-viewer/display-scale";

export type DisplayScalePreference =
  | "auto"
  | 0.5
  | 0.75
  | 1
  | 1.25
  | 1.5
  | 2;

export const DISPLAY_SCALE_OPTIONS: {
  value: DisplayScalePreference;
  label: string;
}[] = [
  { value: "auto", label: "自動" },
  { value: 0.5, label: "50%" },
  { value: 0.75, label: "75%" },
  { value: 1, label: "100%" },
  { value: 1.25, label: "125%" },
  { value: 1.5, label: "150%" },
  { value: 2, label: "200%" },
];

export function uiScaleForViewport(width: number, height: number): number {
  const raw = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
  const clamped = Math.min(UI_SCALE_MAX, Math.max(AUTO_SCALE_MIN, raw));
  return Math.round(clamped * 100) / 100;
}

function clampUiScale(value: number): number {
  const clamped = Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, value));
  return Math.round(clamped * 100) / 100;
}

export function parseDisplayScalePreference(
  raw: string | null,
): DisplayScalePreference {
  if (raw == null || raw === "" || raw === "auto") return "auto";
  const n = Number(raw);
  if (n === 0.5) return 0.5;
  if (n === 0.75) return 0.75;
  if (n === 1) return 1;
  if (n === 1.25) return 1.25;
  if (n === 1.5) return 1.5;
  if (n === 2) return 2;
  return "auto";
}

export function readDisplayScalePreference(): DisplayScalePreference {
  try {
    return parseDisplayScalePreference(
      localStorage.getItem(DISPLAY_SCALE_LS_KEY),
    );
  } catch {
    return "auto";
  }
}

export function writeDisplayScalePreference(
  preference: DisplayScalePreference,
): void {
  try {
    if (preference === "auto") {
      localStorage.removeItem(DISPLAY_SCALE_LS_KEY);
    } else {
      localStorage.setItem(DISPLAY_SCALE_LS_KEY, String(preference));
    }
  } catch {
    // ignore quota / private mode
  }
}

export function resolveUiScale(
  width: number,
  height: number,
  preference: DisplayScalePreference,
): number {
  if (preference === "auto") {
    return uiScaleForViewport(width, height);
  }
  return clampUiScale(preference);
}

export function readUiScale(): number {
  if (typeof window === "undefined") return 1;
  return resolveUiScale(
    window.innerWidth,
    window.innerHeight,
    readDisplayScalePreference(),
  );
}
