import { taskHasUnknownAssignee } from "./assigneeDisplay";
import type { Member, MemberId } from "./memberTypes";
import { findStatusItem, type StatusItem } from "./statusCatalog";
import { findColorItem, type ColorItem } from "./colorCatalog";
import type { Task } from "./types";

export type CatalogMismatchFlags = {
  status: boolean;
  assignee: boolean;
  color: boolean;
  fieldValues: boolean;
};

export function catalogMismatchFlags(
  tasks: readonly Task[],
  statuses: readonly StatusItem[],
  memberCatalog: Map<MemberId, Member> | null,
  knownFieldKeys: ReadonlySet<string>,
  colors: readonly ColorItem[] | null,
): CatalogMismatchFlags {
  let status = false;
  let assignee = false;
  let color = false;
  let fieldValues = false;
  for (const task of tasks) {
    if (!status && findStatusItem(statuses, task.status) === undefined) {
      status = true;
    }
    if (!assignee && taskHasUnknownAssignee(task.assigneeIds, memberCatalog)) {
      assignee = true;
    }
    if (
      !color &&
      colors != null &&
      task.colorId != null &&
      findColorItem(colors, task.colorId) === undefined
    ) {
      color = true;
    }
    if (!fieldValues && task.fieldValues != null) {
      for (const key of Object.keys(task.fieldValues)) {
        if (!knownFieldKeys.has(key)) {
          fieldValues = true;
          break;
        }
      }
    }
    if (status && assignee && color && fieldValues) break;
  }
  return { status, assignee, color, fieldValues };
}

/** @deprecated use catalogMismatchFlags */
export type CatalogMismatchKind = "status" | "assignee" | "both" | null;

export function catalogMismatchKind(
  tasks: readonly Task[],
  statuses: readonly StatusItem[],
  memberCatalog: Map<MemberId, Member> | null,
): CatalogMismatchKind {
  const flags = catalogMismatchFlags(
    tasks,
    statuses,
    memberCatalog,
    new Set(),
    null,
  );
  if (flags.status && flags.assignee) return "both";
  if (flags.status) return "status";
  if (flags.assignee) return "assignee";
  return null;
}

export function catalogMismatchBannerText(
  flags: CatalogMismatchFlags,
): string | null {
  const parts: string[] = [];
  if (flags.status) parts.push("一覧に無いステータス");
  if (flags.assignee) parts.push("一覧に無い担当");
  if (flags.color) parts.push("一覧に無い色");
  if (flags.fieldValues) parts.push("一覧に無い追加項目");
  if (parts.length === 0) return null;
  if (parts.length === 1) {
    return `${parts[0]}があります。`;
  }
  return `${parts.join("と")}があります。`;
}

export const CATALOG_MISMATCH_CLEARED_ANNOUNCEMENT =
  "一覧に無いステータス、担当、色、追加項目はありません。";
