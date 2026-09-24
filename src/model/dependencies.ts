import { forEachTask } from "./tasks";
import type { Category, Task } from "./types";

export type TaskRef = {
  id: number;
  name: string;
  category: string;
  group: string;
};

export type DependencyLink = {
  fromId: number;
  toId: number;
  broken: boolean;
};

/** 後続の開始日が先行の終了日より前なら、前後が逆転している。同日開始は破綻にしない。 */
export function isBrokenLink(
  predecessor: { end: string },
  successor: { start: string },
): boolean {
  return successor.start < predecessor.end;
}

export function listTasks(categories: Category[]): TaskRef[] {
  const tasks: TaskRef[] = [];
  forEachTask(categories, (task, place) => {
    tasks.push({
      id: task.id,
      name: task.name,
      category: place.category,
      group: place.group,
    });
  });
  return tasks;
}

/** このタスク自身の先行と、このタスクを先行にしている後続の本数。 */
export function dependencyCount(categories: Category[], taskId: number): number {
  let count = 0;
  forEachTask(categories, (task) => {
    if (task.id === taskId) count += task.predecessors.length;
    else if (task.predecessors.includes(taskId)) count += 1;
  });
  return count;
}

export function successorIds(categories: Category[], taskId: number): number[] {
  const ids: number[] = [];
  forEachTask(categories, (task) => {
    if (task.predecessors.includes(taskId)) ids.push(task.id);
  });
  return ids;
}

function tasksById(categories: Category[]): Map<number, Task> {
  const byId = new Map<number, Task>();
  forEachTask(categories, (task) => {
    byId.set(task.id, task);
  });
  return byId;
}

/**
 * 起点から predecessors を遡った先行と、後続を末端まで辿ったタスク。
 * 起点を通らない枝は含めない。起点が無ければ null。
 */
export function lineageTaskIds(
  categories: Category[],
  rootId: number,
): Set<number> | null {
  const predecessors = new Map<number, number[]>();
  const successors = new Map<number, number[]>();
  let rootExists = false;
  forEachTask(categories, (task) => {
    if (task.id === rootId) rootExists = true;
    predecessors.set(task.id, task.predecessors);
    for (const predId of task.predecessors) {
      const next = successors.get(predId);
      if (next) next.push(task.id);
      else successors.set(predId, [task.id]);
    }
  });
  if (!rootExists) return null;

  const ids = new Set<number>([rootId]);
  const walk = (nextOf: (id: number) => number[] | undefined) => {
    const stack = [rootId];
    const seen = new Set<number>([rootId]);
    while (stack.length > 0) {
      const id = stack.pop();
      if (id == null) continue;
      for (const other of nextOf(id) ?? []) {
        if (seen.has(other) || !predecessors.has(other)) continue;
        seen.add(other);
        ids.add(other);
        stack.push(other);
      }
    }
  };
  walk((id) => predecessors.get(id));
  walk((id) => successors.get(id));
  return ids;
}

/** 破綻した線の先行または後続になっているタスク。 */
export function brokenLinkTaskIds(categories: Category[]): Set<number> {
  const byId = tasksById(categories);
  const ids = new Set<number>();
  for (const task of byId.values()) {
    for (const predecessorId of task.predecessors) {
      const predecessor = byId.get(predecessorId);
      if (!predecessor || !isBrokenLink(predecessor, task)) continue;
      ids.add(predecessor.id);
      ids.add(task.id);
    }
  }
  return ids;
}

/** フィルタ後の行に先行・後続の両方がいるリンクだけ返す。 */
export function visibleLinks(
  categories: Category[],
  visibleIds: ReadonlySet<number>,
): DependencyLink[] {
  const byId = tasksById(categories);
  const links: DependencyLink[] = [];
  forEachTask(categories, (task) => {
    if (!visibleIds.has(task.id)) return;
    for (const predecessorId of task.predecessors) {
      if (!visibleIds.has(predecessorId)) continue;
      const predecessor = byId.get(predecessorId);
      links.push({
        fromId: predecessorId,
        toId: task.id,
        broken: predecessor ? isBrokenLink(predecessor, task) : false,
      });
    }
  });
  return links;
}

/**
 * 先行バー右端から後続バー左端への折れ線。
 * 日付が重なって右に抜けられない場合も、同じ形で後続の左端へ向ける。
 */
export function linkPoints(
  fromRight: number,
  fromY: number,
  toLeft: number,
  toY: number,
): number[] {
  if (Math.abs(fromY - toY) < 1) {
    return [fromRight, fromY, toLeft, toY];
  }
  const elbow = fromRight + 12;
  return [fromRight, fromY, elbow, fromY, elbow, toY, toLeft, toY];
}
