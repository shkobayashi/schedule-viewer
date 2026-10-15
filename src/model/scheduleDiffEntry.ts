import type { ScheduleId } from "./types";

export type DiffNavTarget =
  | { kind: "none" }
  | { kind: "title" }
  | { kind: "order" }
  | { kind: "task"; taskId: ScheduleId }
  | { kind: "category"; categoryId: ScheduleId }
  | { kind: "group"; groupId: ScheduleId }
  | { kind: "milestone"; milestoneId: ScheduleId }
  | { kind: "milestoneGroup"; milestoneGroupId: ScheduleId }
  | { kind: "deleteTask"; groupId: ScheduleId }
  | { kind: "deleteGroup"; categoryId: ScheduleId }
  | { kind: "deleteCategory" }
  | {
      kind: "deleteMilestone";
      milestoneId: ScheduleId;
      date: string;
      groupId: ScheduleId;
    }
  | { kind: "deleteMilestoneGroup" };

export type ScheduleDiffEntry = {
  text: string;
  nav: DiffNavTarget;
  badge: string;
  summaryName: string;
  /** 画面側の場所。行に全文が入るときだけ表示する */
  location: string | null;
};

const UUID_SUFFIX = / \([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)$/i;

export function buildScheduleDiffEntryDisplay(text: string): {
  badge: string;
  summaryName: string;
  location: string | null;
} {
  const headline = text.split("\n")[0] ?? text;
  let badge: string;
  if (headline.startsWith("title:")) badge = "title";
  else if (headline.startsWith("並び ")) badge = "並び";
  else {
    const space = headline.indexOf(" ");
    badge = space < 0 ? headline : headline.slice(0, space);
  }

  let summaryName: string;
  if (headline.startsWith("title:")) {
    const value = headline.replace(/^title:\s*/, "");
    const arrow = value.indexOf(" → ");
    summaryName = arrow >= 0 ? value.slice(arrow + 3) : value;
  } else if (headline.startsWith("並び ")) {
    summaryName = headline.slice("並び ".length);
  } else {
    const match = /^(?:変更|追加|削除)\s+(?:カテゴリ|グループ|マイルストングループ|マイルストン)?\s*(.+)$/.exec(
      headline,
    );
    const raw = match ? match[1] : headline;
    const changeTask = /^(?:変更|追加|削除)\s+(.+)$/.exec(headline);
    const nameRaw = match ? raw : changeTask ? changeTask[1] : headline;
    summaryName = nameRaw.replace(UUID_SUFFIX, "");
  }

  const body = text.split("\n").slice(1).join("\n");
  const placeMatch = /^ {2}場所: (.+)$/m.exec(body);
  let location: string | null = null;
  if (placeMatch) {
    const value = placeMatch[1];
    const arrow = value.indexOf(" → ");
    location = arrow >= 0 ? value.slice(arrow + 3) : value;
    location = location.replace(UUID_SUFFIX, "");
  }

  return { badge, summaryName, location };
}

export function diffEntryHeadline(text: string): string {
  const line = text.split("\n")[0] ?? text;
  return line;
}

export function diffEntryBody(text: string): string {
  const parts = text.split("\n");
  if (parts.length <= 1) return "";
  return parts.slice(1).join("\n");
}

export function diffEntryBadge(text: string): string {
  const headline = diffEntryHeadline(text);
  if (headline.startsWith("title:")) return "title";
  if (headline.startsWith("並び ")) return "並び";
  const space = headline.indexOf(" ");
  if (space < 0) return headline;
  return headline.slice(0, space);
}

export function diffEntryLocationSuffix(text: string): string | null {
  const body = diffEntryBody(text);
  const match = /^ {2}場所: (.+)$/m.exec(body);
  if (!match) return null;
  const value = match[1];
  const arrow = value.indexOf(" → ");
  if (arrow >= 0) return value.slice(arrow + 3);
  return value;
}

export function diffEntrySummaryName(text: string): string {
  const headline = diffEntryHeadline(text);
  if (headline.startsWith("title:")) {
    return headline.replace(/^title:\s*/, "");
  }
  if (headline.startsWith("並び ")) {
    return headline.slice("並び ".length);
  }
  const match = /^(?:変更|追加|削除)\s+(?:カテゴリ|グループ|マイルストングループ|マイルストン)?\s*(.+)$/.exec(
    headline,
  );
  if (match) return match[1];
  const changeTask = /^(?:変更|追加|削除)\s+(.+)$/.exec(headline);
  if (changeTask) return changeTask[1];
  return headline;
}
