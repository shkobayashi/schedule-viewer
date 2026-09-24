export const UI_SCALE_MIN = 1;
export const UI_SCALE_MAX = 2;
const BASE_WIDTH = 1100;
const BASE_HEIGHT = 780;

export function uiScaleForViewport(width: number, height: number): number {
  const raw = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
  const clamped = Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, raw));
  return Math.round(clamped * 100) / 100;
}

export function readUiScale(): number {
  if (typeof window === "undefined") return 1;
  return uiScaleForViewport(window.innerWidth, window.innerHeight);
}
