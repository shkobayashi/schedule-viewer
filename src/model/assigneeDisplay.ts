import type { Member, MemberId } from "./memberTypes";
import { UNASSIGNED_LABEL } from "./types";

export const UNKNOWN_MEMBER_LABEL = "メンバー不明";

export type AssigneeRowDisplay =
  | { kind: "unassigned"; label: typeof UNASSIGNED_LABEL }
  | { kind: "allUnknown"; label: string }
  | { kind: "text"; label: string };

export function memberMapFromList(members: Member[] | null | undefined): Map<MemberId, Member> {
  const map = new Map<MemberId, Member>();
  if (!members) return map;
  for (const member of members) {
    map.set(member.id, member);
  }
  return map;
}

export function segmentLabelForAssigneeId(
  id: MemberId,
  catalog: Map<MemberId, Member> | null,
  duplicateNames: ReadonlySet<string>,
): string {
  const member = catalog?.get(id);
  if (member) {
    return memberOptionLabel(member, duplicateNames);
  }
  return `${UNKNOWN_MEMBER_LABEL}（${id}）`;
}

export function formatAssigneeListLabel(
  assigneeIds: readonly MemberId[],
  catalog: Map<MemberId, Member> | null,
  duplicateNames: ReadonlySet<string>,
): string {
  return assigneeIds
    .map((id) => segmentLabelForAssigneeId(id, catalog, duplicateNames))
    .join("、");
}

export function resolveAssigneeRowDisplay(
  assigneeIds: readonly MemberId[],
  catalog: Map<MemberId, Member> | null,
  duplicateNames: ReadonlySet<string>,
): AssigneeRowDisplay {
  if (assigneeIds.length === 0) {
    return { kind: "unassigned", label: UNASSIGNED_LABEL };
  }
  let hasResolved = false;
  for (const id of assigneeIds) {
    if (catalog?.has(id)) {
      hasResolved = true;
      break;
    }
  }
  const label = formatAssigneeListLabel(assigneeIds, catalog, duplicateNames);
  if (!hasResolved) {
    return { kind: "allUnknown", label };
  }
  return { kind: "text", label };
}

export function resolveAssigneeDisplay(
  assigneeIds: readonly MemberId[] | null,
  catalog: Map<MemberId, Member> | null,
  duplicateNames: ReadonlySet<string> = new Set(),
): AssigneeRowDisplay {
  return resolveAssigneeRowDisplay(assigneeIds ?? [], catalog, duplicateNames);
}

export function isResolvedAssignee(
  assigneeIds: readonly MemberId[],
  catalog: Map<MemberId, Member> | null,
): boolean {
  return assigneeIds.some((id) => catalog?.has(id) ?? false);
}

export function isUnknownAssigneeId(
  id: MemberId,
  catalog: Map<MemberId, Member> | null,
): boolean {
  return !catalog?.has(id);
}

export function taskHasUnknownAssignee(
  assigneeIds: readonly MemberId[],
  catalog: Map<MemberId, Member> | null,
): boolean {
  return assigneeIds.some((id) => isUnknownAssigneeId(id, catalog));
}

/** @deprecated taskHasUnknownAssignee を使う */
export const isUnknownAssignee = taskHasUnknownAssignee;

/** フィルタ「割り当てなし」: 空、またはカタログに解決できる担当が一人もいない。 */
export function matchesUnassignedFilter(
  assigneeIds: readonly MemberId[],
  catalog: Map<MemberId, Member> | null,
): boolean {
  if (assigneeIds.length === 0) return true;
  return !isResolvedAssignee(assigneeIds, catalog);
}

export function matchesMemberAssigneeFilter(
  assigneeIds: readonly MemberId[],
  memberId: MemberId,
): boolean {
  return assigneeIds.includes(memberId);
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

/** 使用中カタログから、表示名が重複している名前の集合を求める。 */
export function duplicateMemberNamesFromCatalog(
  catalog: Map<MemberId, Member> | null | undefined,
): Set<string> {
  if (!catalog || catalog.size === 0) return new Set();
  return duplicateMemberNames([...catalog.values()]);
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

export function assigneeSidebarLabel(display: AssigneeRowDisplay): string {
  if (display.kind === "unassigned") {
    return "未割当";
  }
  return display.label;
}

/** Excel 担当列。チャートのバー右と同じ文字列（切らない）。 */
export function assigneeExcelCellLabel(
  assigneeIds: readonly MemberId[],
  catalog: Map<MemberId, Member> | null,
): string {
  const duplicateNames = duplicateMemberNamesFromCatalog(catalog);
  const display = resolveAssigneeRowDisplay(
    assigneeIds,
    catalog,
    duplicateNames,
  );
  return assigneeSidebarLabel(display);
}

export function formatUnknownAssigneeOption(id: MemberId): string {
  return `${UNKNOWN_MEMBER_LABEL}（${id}）`;
}
