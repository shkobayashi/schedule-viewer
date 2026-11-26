import { findStatusItem, statusLabel, type StatusItem } from "./statusCatalog";

const SIDEBAR_STATUS_CHARS_MIN = 3;
const SIDEBAR_STATUS_CHARS_MAX = 8;

/** 左一覧のステータス列。見えているラベルの文字数に合わせ、3文字以上8文字以下にする。 */
export function statusColumnChars(labels: readonly string[]): number {
  let chars = SIDEBAR_STATUS_CHARS_MIN;
  for (const label of labels) {
    if (label.length > chars) chars = label.length;
  }
  return Math.min(chars, SIDEBAR_STATUS_CHARS_MAX);
}

export type StatusSidebarDisplay =
  | { kind: "known"; label: string }
  | { kind: "unknown"; id: string };

export function resolveStatusSidebarDisplay(
  statuses: readonly StatusItem[],
  statusId: string,
): StatusSidebarDisplay {
  if (findStatusItem(statuses, statusId)) {
    return { kind: "known", label: statusLabel(statuses, statusId) };
  }
  return { kind: "unknown", id: statusId };
}

export function statusSidebarColumnLabel(display: StatusSidebarDisplay): string {
  return display.kind === "known" ? display.label : display.id;
}
