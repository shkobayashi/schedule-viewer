import {
  applyCssPalette,
  paletteFor,
  type ResolvedColorScheme,
} from "./palette";

export type ColorSchemePreference = "system" | ResolvedColorScheme;

export const COLOR_SCHEME_LS_KEY = "schedule-viewer/color-scheme";

export const COLOR_SCHEME_OPTIONS: {
  value: ColorSchemePreference;
  label: string;
}[] = [
  { value: "system", label: "システム設定に合わせる" },
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
];

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function parseColorSchemePreference(
  raw: string | null,
): ColorSchemePreference {
  if (raw === "light" || raw === "dark") return raw;
  return "system";
}

export function readColorSchemePreference(): ColorSchemePreference {
  try {
    return parseColorSchemePreference(
      localStorage.getItem(COLOR_SCHEME_LS_KEY),
    );
  } catch {
    return "system";
  }
}

export function writeColorSchemePreference(
  preference: ColorSchemePreference,
): void {
  try {
    if (preference === "system") {
      localStorage.removeItem(COLOR_SCHEME_LS_KEY);
    } else {
      localStorage.setItem(COLOR_SCHEME_LS_KEY, preference);
    }
  } catch {
    // ignore quota / private mode
  }
}

export function resolveColorScheme(
  preference: ColorSchemePreference,
): ResolvedColorScheme {
  if (preference === "light" || preference === "dark") return preference;
  return systemPrefersDark() ? "dark" : "light";
}

export function applyResolvedColorScheme(resolved: ResolvedColorScheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.colorScheme = resolved;
  root.style.colorScheme = resolved;
  applyCssPalette(paletteFor(resolved));
}

export function readResolvedColorScheme(): ResolvedColorScheme {
  return resolveColorScheme(readColorSchemePreference());
}

export function subscribeSystemColorScheme(
  onChange: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onChange();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
