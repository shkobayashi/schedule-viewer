import type { ResolvedColorScheme } from "./palette";

export const STATUSES_SCHEMA_VERSION = 1;

/** バーの地と枠の色。進捗の帯は枠と同じ色で描く。 */
export type StatusColor = { bg: string; border: string };

export type StatusItem = {
  id: string;
  name: string;
  color: { light: StatusColor; dark: StatusColor };
  /** 完了として扱う。期限超過と「完了以外」の絞り込みから外れる。 */
  closed: boolean;
  /** 意味と、どの状態のタスクに付けるか。LLM が `id` を選ぶ手がかり。 */
  description: string;
};

export type StatusesDocument = {
  schemaVersion: typeof STATUSES_SCHEMA_VERSION;
  statuses: StatusItem[];
};

export type StatusCatalogInfo = { id: string; label: string };

export const BUILTIN_STATUS_ITEMS: readonly StatusItem[] = [
  {
    id: "not-started",
    name: "未着手",
    color: {
      light: { bg: "#E2E6ED", border: "#7d8799" },
      dark: { bg: "#454b5c", border: "#8a94a6" },
    },
    closed: false,
    description: "まだ着手していない。開始日が来ていても、手を付けていなければこれにする。",
  },
  {
    id: "in-progress",
    name: "進行中",
    color: {
      light: { bg: "#DEE3FB", border: "#4C5FD5" },
      dark: { bg: "#2e3344", border: "#7b8cff" },
    },
    closed: false,
    description: "着手済みで、まだ終わっていない。",
  },
  {
    id: "done",
    name: "完了",
    color: {
      light: { bg: "#247A55", border: "#1F6B4A" },
      dark: { bg: "#3d9a72", border: "#4cb088" },
    },
    closed: true,
    description: "終わった。以後の作業は残っていない。",
  },
];

export const BUILTIN_STATUSES: StatusesDocument = {
  schemaVersion: STATUSES_SCHEMA_VERSION,
  statuses: [...BUILTIN_STATUS_ITEMS],
};

/** 一覧に無い `id` の色。意味を足さない。 */
export const NEUTRAL_STATUS_COLOR: { light: StatusColor; dark: StatusColor } = {
  light: { bg: "#E2E6ED", border: "#7d8799" },
  dark: { bg: "#454b5c", border: "#8a94a6" },
};

export function findStatusItem(
  statuses: readonly StatusItem[],
  id: string,
): StatusItem | undefined {
  return statuses.find((item) => item.id === id);
}

/** 一覧に無い `id` は、`id` をそのまま出す。 */
export function statusLabel(statuses: readonly StatusItem[], id: string): string {
  return findStatusItem(statuses, id)?.name ?? id;
}

/** 一覧に無い `id` は完了として扱わない。 */
export function isClosedStatus(statuses: readonly StatusItem[], id: string): boolean {
  return findStatusItem(statuses, id)?.closed === true;
}

export function statusColorFor(
  statuses: readonly StatusItem[],
  id: string,
  scheme: ResolvedColorScheme,
): StatusColor {
  const color = findStatusItem(statuses, id)?.color ?? NEUTRAL_STATUS_COLOR;
  return scheme === "dark" ? color.dark : color.light;
}

/**
 * 追加や複製の初期値。一覧にある `not-started`、無ければ完了でない最初の項目、
 * それも無ければ最初の項目。
 */
export function defaultStatusId(statuses: readonly StatusItem[]): string {
  if (findStatusItem(statuses, "not-started")) return "not-started";
  const open = statuses.find((item) => !item.closed);
  return (open ?? statuses[0])?.id ?? "not-started";
}

function channel(hex: string, offset: number): number {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

/** 地の色に重ねる文字の色。白と暗色のうち、コントラストが高いほう。 */
export function labelColorOn(
  bg: string,
  light: string,
  dark: string,
): string {
  const l = luminance(bg);
  const withLight = (luminance(light) + 0.05) / (l + 0.05);
  const withDark = (l + 0.05) / (luminance(dark) + 0.05);
  return withLight >= withDark ? light : dark;
}
