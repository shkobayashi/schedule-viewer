import type { Category, Task } from "./types";

export type TaskRef = {
  id: number;
  name: string;
  category: string;
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
  return categories.flatMap((category) =>
    category.tasks.map((task) => ({
      id: task.id,
      name: task.name,
      category: category.name,
    })),
  );
}

export function successorIds(categories: Category[], taskId: number): number[] {
  const ids: number[] = [];
  for (const category of categories) {
    for (const task of category.tasks) {
      if (task.predecessors.includes(taskId)) ids.push(task.id);
    }
  }
  return ids;
}

function tasksById(categories: Category[]): Map<number, Task> {
  const byId = new Map<number, Task>();
  for (const category of categories) {
    for (const task of category.tasks) byId.set(task.id, task);
  }
  return byId;
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
  for (const category of categories) {
    for (const task of category.tasks) {
      if (!visibleIds.has(task.id)) continue;
      for (const predecessorId of task.predecessors) {
        if (!visibleIds.has(predecessorId)) continue;
        const predecessor = byId.get(predecessorId);
        links.push({
          fromId: predecessorId,
          toId: task.id,
          broken: predecessor ? isBrokenLink(predecessor, task) : false,
        });
      }
    }
  }
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
