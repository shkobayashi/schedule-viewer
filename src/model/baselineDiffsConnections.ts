import { connectionPairKey } from "./connections";
import type { BaselineDiffClassification } from "./baselineDiffs";
import type { ScheduleDocument, ScheduleId, TaskConnection } from "./types";

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

function taskIdsInDoc(doc: ScheduleDocument): Set<ScheduleId> {
  const ids = new Set<ScheduleId>();
  if (doc.outline != null && doc.outline.length > 0) {
    const walk = (nodes: import("./types").OutlineChild[]) => {
      for (const node of nodes) {
        if ("start" in node && "end" in node) ids.add(node.id);
        else walk(node.children);
      }
    };
    walk(doc.outline);
    return ids;
  }
  for (const category of doc.categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) ids.add(task.id);
    }
  }
  return ids;
}

function pairHeadline(
  connection: TaskConnection,
  names: Map<ScheduleId, string>,
): string {
  const [a, b] = connection.taskIds;
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
  return `繋がり ${left[0]} (${left[1]}) / ${left[2]} (${left[3]}) label: ${connection.label}`;
}

function nameMap(doc: ScheduleDocument): Map<ScheduleId, string> {
  const map = new Map<ScheduleId, string>();
  if (doc.outline != null && doc.outline.length > 0) {
    const walk = (nodes: import("./types").OutlineChild[]) => {
      for (const node of nodes) {
        if ("start" in node && "end" in node) map.set(node.id, node.name);
        else walk(node.children);
      }
    };
    walk(doc.outline);
    return map;
  }
  for (const category of doc.categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) map.set(task.id, task.name);
    }
  }
  return map;
}

function connectionLabelsEqual(
  a: TaskConnection | undefined,
  b: TaskConnection | undefined,
): boolean {
  return a != null && b != null && a.label === b.label;
}

/** baselineDiffs.ts の classifyPresence と同じ規則。 */
function classifyConnectionPresence(
  inBaseline: boolean,
  inScreen: boolean,
  inFile: boolean,
  baselineEqualsScreen: boolean,
  baselineEqualsFile: boolean,
  screenEqualsFile: boolean,
): BaselineDiffClassification | null {
  if (!inBaseline && inScreen && inFile) {
    return screenEqualsFile ? "同じ" : "異なる";
  }
  if (inBaseline && !inScreen && !inFile) {
    return "同じ";
  }
  if (inBaseline && inScreen && inFile) {
    if (baselineEqualsScreen && baselineEqualsFile) return null;
    if (!baselineEqualsScreen && baselineEqualsFile) return "画面のみ";
    if (baselineEqualsScreen && !baselineEqualsFile) return "ファイルのみ";
    if (!baselineEqualsScreen && !baselineEqualsFile && screenEqualsFile) {
      return "同じ";
    }
    if (!baselineEqualsScreen && !baselineEqualsFile && !screenEqualsFile) {
      return "異なる";
    }
    return null;
  }
  if (inBaseline && !inScreen && inFile) {
    if (baselineEqualsFile) return "画面のみ";
    return "削除と変更";
  }
  if (inBaseline && inScreen && !inFile) {
    if (baselineEqualsScreen) return "ファイルのみ";
    return "削除と変更";
  }
  if (!inBaseline && inScreen && !inFile) return "画面のみ";
  if (!inBaseline && !inScreen && inFile) return "ファイルのみ";
  return null;
}

function connectionAddDeleteConflict(
  connection: TaskConnection,
  side: "screen" | "file",
  baselineTasks: Set<ScheduleId>,
  screenTasks: Set<ScheduleId>,
  fileTasks: Set<ScheduleId>,
): boolean {
  for (const id of connection.taskIds) {
    if (!baselineTasks.has(id)) continue;
    if (side === "file") {
      if (!screenTasks.has(id) && fileTasks.has(id)) return true;
    } else if (!fileTasks.has(id) && screenTasks.has(id)) {
      return true;
    }
  }
  return false;
}

function classifyConnectionTriple(
  inB: boolean,
  inS: boolean,
  inF: boolean,
  base: TaskConnection | undefined,
  scr: TaskConnection | undefined,
  fil: TaskConnection | undefined,
  baselineTasks: Set<ScheduleId>,
  screenTasks: Set<ScheduleId>,
  fileTasks: Set<ScheduleId>,
): BaselineDiffClassification | null {
  const baselineEqualsScreen =
    inB && inS ? connectionLabelsEqual(base, scr) : true;
  const baselineEqualsFile =
    inB && inF ? connectionLabelsEqual(base, fil) : true;
  const screenEqualsFile =
    inS && inF ? connectionLabelsEqual(scr, fil) : true;

  let label = classifyConnectionPresence(
    inB,
    inS,
    inF,
    baselineEqualsScreen,
    baselineEqualsFile,
    screenEqualsFile,
  );

  const conn = scr ?? fil ?? base;
  if (conn && !inS && inF) {
    if (
      connectionAddDeleteConflict(
        conn,
        "file",
        baselineTasks,
        screenTasks,
        fileTasks,
      )
    ) {
      label = "追加と削除";
    }
  }
  if (conn && inS && !inF) {
    if (
      connectionAddDeleteConflict(
        conn,
        "screen",
        baselineTasks,
        screenTasks,
        fileTasks,
      )
    ) {
      label = "追加と削除";
    }
  }

  return label;
}

export function appendConnectionBaselineClassification(
  lines: { label: BaselineDiffClassification; headline: string }[],
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
): void {
  const baseMap = indexConnections(baseline.connections);
  const screenMap = indexConnections(screen.connections);
  const fileMap = indexConnections(file.connections);
  const baselineTasks = taskIdsInDoc(baseline);
  const screenTasks = taskIdsInDoc(screen);
  const fileTasks = taskIdsInDoc(file);
  const names = nameMap(baseline);

  const keys = new Set<string>([
    ...baseMap.keys(),
    ...screenMap.keys(),
    ...fileMap.keys(),
  ]);

  for (const key of keys) {
    const inB = baseMap.has(key);
    const inS = screenMap.has(key);
    const inF = fileMap.has(key);
    const base = baseMap.get(key);
    const scr = screenMap.get(key);
    const fil = fileMap.get(key);

    const label = classifyConnectionTriple(
      inB,
      inS,
      inF,
      base,
      scr,
      fil,
      baselineTasks,
      screenTasks,
      fileTasks,
    );

    const conn = scr ?? fil ?? base;
    if (!conn || label == null || label === "同じ") continue;
    lines.push({ label, headline: pairHeadline(conn, names) });
  }
}

function mergedConnectionForKey(
  inB: boolean,
  inS: boolean,
  inF: boolean,
  _base: TaskConnection | undefined,
  scr: TaskConnection | undefined,
  fil: TaskConnection | undefined,
): TaskConnection | undefined {
  if (inS && inF && scr && fil) {
    if (scr.label !== fil.label) return undefined;
    return scr;
  }
  if (inS && !inF) {
    if (inB) return undefined;
    return scr;
  }
  if (!inS && inF) {
    if (inB) return undefined;
    return fil;
  }
  return undefined;
}

export function mergeBaselineConnections(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
): TaskConnection[] | undefined {
  const probe: { label: BaselineDiffClassification; headline: string }[] = [];
  appendConnectionBaselineClassification(probe, baseline, screen, file);
  if (
    probe.some(
      (line) =>
        line.label === "異なる" ||
        line.label === "削除と変更" ||
        line.label === "追加と削除",
    )
  ) {
    return undefined;
  }

  const baseMap = indexConnections(baseline.connections);
  const screenMap = indexConnections(screen.connections);
  const fileMap = indexConnections(file.connections);
  const screenTasks = taskIdsInDoc(screen);
  const fileTasks = taskIdsInDoc(file);

  const keys = new Set<string>([
    ...baseMap.keys(),
    ...screenMap.keys(),
    ...fileMap.keys(),
  ]);

  const merged = new Map<string, TaskConnection>();
  for (const key of keys) {
    const inB = baseMap.has(key);
    const inS = screenMap.has(key);
    const inF = fileMap.has(key);
    const conn = mergedConnectionForKey(
      inB,
      inS,
      inF,
      baseMap.get(key),
      screenMap.get(key),
      fileMap.get(key),
    );
    if (!conn) continue;
    const [a, b] = conn.taskIds;
    const aLive = screenTasks.has(a) || fileTasks.has(a);
    const bLive = screenTasks.has(b) || fileTasks.has(b);
    if (!aLive || !bLive) continue;
    merged.set(key, conn);
  }

  const list = [...merged.values()];
  return list.length > 0 ? list : undefined;
}
