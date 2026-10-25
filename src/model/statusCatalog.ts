import type { ResolvedColorScheme } from "./palette";

export const STATUSES_SCHEMA_VERSION = 2;

/** イナズマ線と期限超過の扱い。タスクの `status` には書かない。 */
export type StatusRole = "not-started" | "started" | "done" | "unmanaged";

/** バーの地と枠の色。進捗の帯は枠と同じ色で描く。 */
export type StatusColor = { bg: string; border: string };

export type StatusItem = {
  id: string;
  name: string;
  color: { light: StatusColor; dark: StatusColor };
  role: StatusRole;
  /** その `id` を選ぶ状態だけ。LLM が `id` を選ぶ手がかり。 */
  description: string;
  /** その `id` を選んだあとに LLM が守ること。空なら持たない。 */
  instruction?: string;
};

export type StatusesDocument = {
  schemaVersion: typeof STATUSES_SCHEMA_VERSION;
  statuses: StatusItem[];
};

export type StatusCatalogInfo = { id: string; label: string };

export const STATUS_ROLE_LABELS: Record<StatusRole, string> = {
  "not-started": "未着手",
  started: "着手済み",
  done: "完了",
  unmanaged: "管理外",
};

export const STATUS_ROLE_HINTS: Record<StatusRole, string> = {
  "not-started":
    "開始日を過ぎると線は開始日へ折れ、終了日を過ぎると終了日へ折れて赤くなる。",
  started:
    "開始日より前は線が開始日まで右へ折れ、終了日を過ぎると終了日へ折れて赤くなる。",
  done:
    "終了日より前は線が終了日まで右へ折れる。終了日を過ぎると線は今日に戻り、赤くならない。「完了以外」からは外れる。",
  unmanaged:
    "線は今日のままである。終了日を過ぎても赤くならない。「完了以外」には残る。",
};

export const BUILTIN_STATUS_ITEMS: readonly StatusItem[] = [
  {
    id: "not-started",
    name: "未着手",
    color: {
      light: { bg: "#E2E6ED", border: "#7d8799" },
      dark: { bg: "#454b5c", border: "#8a94a6" },
    },
    role: "not-started",
    description: "開始日が来ていても、手を付けていなければこれにする。",
  },
  {
    id: "in-progress",
    name: "進行中",
    color: {
      light: { bg: "#DEE3FB", border: "#4C5FD5" },
      dark: { bg: "#2e3344", border: "#7b8cff" },
    },
    role: "started",
    description: "手を付けていて、作業が残っている。",
  },
  {
    id: "done",
    name: "完了",
    color: {
      light: { bg: "#247A55", border: "#1F6B4A" },
      dark: { bg: "#3d9a72", border: "#4cb088" },
    },
    role: "done",
    description: "作業は終わり、再開も確認も残っていない。",
  },
];

/** 空白だけの `instruction` を外す。 */
export function normalizeStatusItem(item: StatusItem): StatusItem {
  const instruction = item.instruction?.trim();
  if (!instruction) {
    if (item.instruction === undefined) return item;
    const { instruction: _removed, ...rest } = item;
    void _removed;
    return rest;
  }
  if (item.instruction === instruction) return item;
  return { ...item, instruction };
}

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

/**
 * 一覧の項目の扱い。一覧に無い `id` は null（四つのどれにもしない）。
 */
export function statusRoleFor(
  statuses: readonly StatusItem[],
  id: string,
): StatusRole | null {
  return findStatusItem(statuses, id)?.role ?? null;
}

/** 「完了以外」から外すのは完了だけ。一覧に無い `id` は残る。 */
export function isDoneStatus(statuses: readonly StatusItem[], id: string): boolean {
  return statusRoleFor(statuses, id) === "done";
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
  const open = statuses.find((item) => item.role !== "done");
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
