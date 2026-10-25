import { isUnknownAssignee } from "./assigneeDisplay";
import type { Member, MemberId } from "./memberTypes";
import { findStatusItem, type StatusItem } from "./statusCatalog";
import type { Task } from "./types";

export type CatalogMismatchKind = "status" | "assignee" | "both" | null;

export function catalogMismatchKind(
  tasks: readonly Task[],
  statuses: readonly StatusItem[],
  memberCatalog: Map<MemberId, Member> | null,
): CatalogMismatchKind {
  let hasStatus = false;
  let hasAssignee = false;
  for (const task of tasks) {
    if (!hasStatus && findStatusItem(statuses, task.status) === undefined) {
      hasStatus = true;
    }
    if (!hasAssignee && isUnknownAssignee(task.assigneeId, memberCatalog)) {
      hasAssignee = true;
    }
    if (hasStatus && hasAssignee) return "both";
  }
  if (hasStatus && hasAssignee) return "both";
  if (hasStatus) return "status";
  if (hasAssignee) return "assignee";
  return null;
}

export function catalogMismatchBannerText(kind: CatalogMismatchKind): string | null {
  switch (kind) {
    case "status":
      return "一覧に無いステータスがあります。";
    case "assignee":
      return "一覧に無い担当があります。";
    case "both":
      return "一覧に無いステータスと担当があります。";
    default:
      return null;
  }
}

export const CATALOG_MISMATCH_CLEARED_ANNOUNCEMENT =
  "一覧に無いステータスや担当はありません。";
