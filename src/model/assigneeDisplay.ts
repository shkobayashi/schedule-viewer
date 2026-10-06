import type { Member, MemberId } from "./memberTypes";
import { UNASSIGNED_LABEL } from "./types";

export const UNKNOWN_MEMBER_LABEL = "メンバー不明";

export type AssigneeDisplay =
  | { kind: "unassigned"; label: typeof UNASSIGNED_LABEL }
  | { kind: "resolved"; id: MemberId; label: string }
  | { kind: "unknown"; id: MemberId; label: typeof UNKNOWN_MEMBER_LABEL };

export function memberMapFromList(members: Member[] | null | undefined): Map<MemberId, Member> {
  const map = new Map<MemberId, Member>();
  if (!members) return map;
  for (const member of members) {
    map.set(member.id, member);
  }
  return map;
}

export function resolveAssigneeDisplay(
  assigneeId: MemberId | null,
  catalog: Map<MemberId, Member> | null,
): AssigneeDisplay {
  if (assigneeId == null) {
    return { kind: "unassigned", label: UNASSIGNED_LABEL };
  }
  const member = catalog?.get(assigneeId);
  if (member) {
    return { kind: "resolved", id: assigneeId, label: member.name };
  }
  return { kind: "unknown", id: assigneeId, label: UNKNOWN_MEMBER_LABEL };
}

export function isResolvedAssignee(
  assigneeId: MemberId | null,
  catalog: Map<MemberId, Member> | null,
): boolean {
  if (assigneeId == null) return false;
  return catalog?.has(assigneeId) ?? false;
}

export function isUnknownAssignee(
  assigneeId: MemberId | null,
  catalog: Map<MemberId, Member> | null,
): boolean {
  if (assigneeId == null) return false;
  return !catalog?.has(assigneeId);
}

/** フィルタ「割り当てなし」: null とメンバー不明の両方。 */
export function matchesUnassignedFilter(
  assigneeId: MemberId | null,
  catalog: Map<MemberId, Member> | null,
): boolean {
  if (assigneeId == null) return true;
  return isUnknownAssignee(assigneeId, catalog);
}

export function memberOptionLabel(member: Member, duplicateNames: ReadonlySet<string>): string {
  if (duplicateNames.has(member.name)) {
    return `${member.name}（${member.id}）`;
  }
  return member.name;
}

export function duplicateMemberNames(members: Member[]): Set<string> {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const member of members) {
    if (seen.has(member.name)) dupes.add(member.name);
    seen.add(member.name);
  }
  return dupes;
}

const SIDEBAR_ASSIGNEE_CHARS_MIN = 3;
const SIDEBAR_ASSIGNEE_CHARS_MAX = 8;

/** 左一覧の担当列。見えているラベルの文字数に合わせ、3文字以上8文字以下にする。 */
export function assigneeColumnChars(labels: readonly string[]): number {
  let chars = SIDEBAR_ASSIGNEE_CHARS_MIN;
  for (const label of labels) {
    if (label.length > chars) chars = label.length;
  }
  return Math.min(chars, SIDEBAR_ASSIGNEE_CHARS_MAX);
}

export function assigneeSidebarLabel(display: AssigneeDisplay): string {
  if (display.kind === "unknown") {
    return `${UNKNOWN_MEMBER_LABEL}（${display.id}）`;
  }
  return display.label;
}

export function formatUnknownAssigneeOption(id: MemberId): string {
  return `${UNKNOWN_MEMBER_LABEL}（${id}）`;
}
