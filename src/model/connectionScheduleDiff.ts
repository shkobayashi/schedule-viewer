import { connectionPairKey } from "./connections";
import type { DiffNavTarget } from "./scheduleDiffEntry";
import type { ScheduleDocument, ScheduleId, TaskConnection } from "./types";

function connectionPairLine(
  a: ScheduleId,
  b: ScheduleId,
  names: Map<ScheduleId, string>,
): string {
  const nameA = names.get(a) ?? a;
  const nameB = names.get(b) ?? b;
  const left =
    nameA < nameB
      ? [nameA, a, nameB, b]
      : nameB < nameA
        ? [nameB, b, nameA, a]
        : a < b
          ? [nameA, a, nameB, b]
          : [nameB, b, nameA, a];
  return `${left[0]} (${left[1]}) / ${left[2]} (${left[3]})`;
}

function connectionNav(a: ScheduleId, b: ScheduleId): DiffNavTarget {
  return { kind: "connection", taskIdA: a, taskIdB: b };
}

function indexConnections(
  list: readonly TaskConnection[] | undefined,
): Map<string, TaskConnection> {
  const map = new Map<string, TaskConnection>();
  for (const connection of list ?? []) {
    const [a, b] = connection.taskIds;
    map.set(connectionPairKey(a, b), connection);
  }
  return map;
}

/** 画面とファイルの connections 差分行。タスク削除による組の削除は別途。 */
export function appendConnectionScheduleDiff(
  push: (text: string, nav: DiffNavTarget) => void,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  screenTaskNames: Map<ScheduleId, string>,
  fileTaskNames: Map<ScheduleId, string>,
  deletedTaskIds: ReadonlySet<ScheduleId>,
): void {
  const screenMap = indexConnections(screen.connections);
  const fileMap = indexConnections(file.connections);

  for (const connection of screen.connections ?? []) {
    const [a, b] = connection.taskIds;
    const key = connectionPairKey(a, b);
    const fileConn = fileMap.get(key);
    if (!fileConn) {
      if (deletedTaskIds.has(a) || deletedTaskIds.has(b)) continue;
      push(
        `追加 繋がり\n${connectionPairLine(a, b, screenTaskNames)}\nlabel: ${connection.label}`,
        connectionNav(a, b),
      );
      continue;
    }
    if (fileConn.label !== connection.label) {
      push(
        `変更 繋がり\n${connectionPairLine(a, b, screenTaskNames)}\nlabel: ${fileConn.label} → ${connection.label}`,
        connectionNav(a, b),
      );
    }
  }

  for (const connection of file.connections ?? []) {
    const [a, b] = connection.taskIds;
    const key = connectionPairKey(a, b);
    if (screenMap.has(key)) continue;
    push(
      `削除 繋がり\n${connectionPairLine(a, b, fileTaskNames)}\nlabel: ${connection.label}`,
      connectionNav(a, b),
    );
  }
}

export function deletedTaskIdsFromDiff(
  screen: ScheduleDocument,
  file: ScheduleDocument,
): Set<ScheduleId> {
  const screenIds = new Set(
    collectTaskIdsFromDoc(screen),
  );
  const deleted = new Set<ScheduleId>();
  for (const id of collectTaskIdsFromDoc(file)) {
    if (!screenIds.has(id)) deleted.add(id);
  }
  return deleted;
}

function collectTaskIdsFromDoc(doc: ScheduleDocument): ScheduleId[] {
  const ids: ScheduleId[] = [];
  if (doc.outline != null && doc.outline.length > 0) {
    const walk = (nodes: import("./types").OutlineChild[]) => {
      for (const node of nodes) {
        if ("start" in node && "end" in node) ids.push(node.id);
        else walk(node.children);
      }
    };
    walk(doc.outline);
    return ids;
  }
  for (const category of doc.categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) ids.push(task.id);
    }
  }
  return ids;
}
