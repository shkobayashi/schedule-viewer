import { LAYOUT_BAR_HEIGHT } from "./layoutSizes";
import {
  validateDependencyCycles,
  validatePredecessorRefs,
  type ValidationIssue,
} from "./scheduleSemantics";
import { forEachTask, mapTasks } from "./tasks";
import { SCHEDULE_SCHEMA_VERSION, type Category, type ScheduleId, type Task } from "./types";
import { formatValidationErrors } from "./validateSchedule";

export type TaskRef = {
  id: ScheduleId;
  name: string;
  category: string;
  group: string;
};

export type DependencyLink = {
  fromId: ScheduleId;
  toId: ScheduleId;
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
export function dependencyCount(categories: Category[], taskId: ScheduleId): number {
  let count = 0;
  forEachTask(categories, (task) => {
    if (task.id === taskId) count += task.predecessors.length;
    else if (task.predecessors.includes(taskId)) count += 1;
  });
  return count;
}

export function successorIds(categories: Category[], taskId: ScheduleId): ScheduleId[] {
  const ids: ScheduleId[] = [];
  forEachTask(categories, (task) => {
    if (task.predecessors.includes(taskId)) ids.push(task.id);
  });
  return ids;
}

function tasksById(categories: Category[]): Map<ScheduleId, Task> {
  const byId = new Map<ScheduleId, Task>();
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
  rootId: ScheduleId,
): Set<ScheduleId> | null {
  const predecessors = new Map<ScheduleId, ScheduleId[]>();
  const successors = new Map<ScheduleId, ScheduleId[]>();
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

  const ids = new Set<ScheduleId>([rootId]);
  const walk = (nextOf: (id: ScheduleId) => ScheduleId[] | undefined) => {
    const stack = [rootId];
    const seen = new Set<ScheduleId>([rootId]);
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
export function brokenLinkTaskIds(categories: Category[]): Set<ScheduleId> {
  const byId = tasksById(categories);
  const ids = new Set<ScheduleId>();
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
  visibleIds: ReadonlySet<ScheduleId>,
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

/** 矢印の頭の長さ。画面の Arrow と書き出しの marker と揃える。 */
export const LINK_POINTER_LENGTH = 7;

/** 後続バーの左に残す水平区間。頭がバーに隠れない長さ。 */
export const LINK_ARROW_CLEARANCE = LINK_POINTER_LENGTH + 3;

const LINK_ELBOW = 12;
const LINK_STUB = 8;
const LINK_LANE_GAP = 4;

/**
 * 先行バー右端から後続バー左端への折れ線。
 * 最後の区間は右向きで、頭が後続バーの外に収まる。
 * 右へ出る余地が足りないときは、先行バーの外側を回ってから左端へ入る。
 */
export function linkPoints(
  fromRight: number,
  fromY: number,
  toLeft: number,
  toY: number,
  barHeight = LAYOUT_BAR_HEIGHT,
): number[] {
  const sameRow = Math.abs(fromY - toY) < 1;
  if (toLeft - fromRight >= LINK_ARROW_CLEARANCE) {
    if (sameRow) return [fromRight, fromY, toLeft, toY];
    const elbow = Math.min(fromRight + LINK_ELBOW, toLeft - LINK_ARROW_CLEARANCE);
    if (elbow <= fromRight + 0.5) {
      return [fromRight, fromY, fromRight, toY, toLeft, toY];
    }
    return [fromRight, fromY, elbow, fromY, elbow, toY, toLeft, toY];
  }
  const laneDir = sameRow ? -1 : Math.sign(toY - fromY);
  const laneY = fromY + laneDir * (barHeight / 2 + LINK_LANE_GAP);
  const exitX = fromRight + LINK_STUB;
  const approachX = toLeft - LINK_ARROW_CLEARANCE;
  return [
    fromRight,
    fromY,
    exitX,
    fromY,
    exitX,
    laneY,
    approachX,
    laneY,
    approachX,
    toY,
    toLeft,
    toY,
  ];
}

/** 描いた線より広い当たり。重なったときはこの距離以内で一番近い 1 本。 */
export const LINK_HIT_DISTANCE = 8;

export type LinkPolyline = {
  fromId: ScheduleId;
  toId: ScheduleId;
  points: number[];
};

function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function pointToPolylineDistance(
  px: number,
  py: number,
  points: readonly number[],
): number {
  if (points.length < 4) {
    if (points.length < 2) return Infinity;
    return Math.hypot(px - points[0]!, py - points[1]!);
  }
  let best = Infinity;
  for (let i = 0; i + 3 < points.length; i += 2) {
    const distance = pointToSegmentDistance(
      px,
      py,
      points[i]!,
      points[i + 1]!,
      points[i + 2]!,
      points[i + 3]!,
    );
    if (distance < best) best = distance;
  }
  return best;
}

/** 閾値以内でポインタに一番近い線。無ければ null。 */
export function nearestLinkHit(
  links: readonly LinkPolyline[],
  x: number,
  y: number,
  maxDistance = LINK_HIT_DISTANCE,
): LinkPolyline | null {
  let best: LinkPolyline | null = null;
  let bestDistance = maxDistance;
  for (const link of links) {
    const distance = pointToPolylineDistance(x, y, link.points);
    if (distance < bestDistance || (distance === bestDistance && best == null)) {
      if (distance <= maxDistance) {
        best = link;
        bestDistance = distance;
      }
    }
  }
  return best;
}

export type PredecessorLinkResult =
  | { ok: true; categories: Category[] }
  | { ok: false; message: string };

function duplicatePredecessorIssues(categories: Category[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  categories.forEach((category, ci) => {
    category.groups.forEach((group, gi) => {
      group.tasks.forEach((task, ti) => {
        const seen = new Set<ScheduleId>();
        const taskPath = `/categories/${ci}/groups/${gi}/tasks/${ti}`;
        task.predecessors.forEach((predId, pi) => {
          const predPath = `${taskPath}/predecessors/${pi}`;
          if (predId === task.id) {
            issues.push({
              path: predPath,
              message: "自分自身を先行に指定できません",
            });
          }
          if (seen.has(predId)) {
            issues.push({ path: predPath, message: "先行 ID が重複しています" });
          }
          seen.add(predId);
        });
      });
    });
  });
  return issues;
}

/**
 * 後続の predecessors に先行を足す。
 * 既存の線と循環は保存せず、編集ダイアログと同じ検証文言を返す。
 */
export function tryAddPredecessorLink(
  categories: Category[],
  predecessorId: ScheduleId,
  successorId: ScheduleId,
): PredecessorLinkResult {
  let found = false;
  const next = mapTasks(categories, (task) => {
    if (task.id !== successorId) return task;
    found = true;
    return { ...task, predecessors: [...task.predecessors, predecessorId] };
  });
  if (!found) return { ok: false, message: "後続のタスクがありません。" };

  const candidate: {
    schemaVersion: typeof SCHEDULE_SCHEMA_VERSION;
    title: string;
    milestoneGroups: [];
    categories: Category[];
    milestones: [];
  } = {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: "link",
    milestoneGroups: [],
    categories: next,
    milestones: [],
  };
  const issues = [
    ...validateDependencyCycles(candidate),
    ...validatePredecessorRefs(candidate),
    ...duplicatePredecessorIssues(next),
  ];
  if (issues.length > 0) {
    return { ok: false, message: formatValidationErrors(issues) };
  }
  return { ok: true, categories: next };
}

/** 後続の predecessors から、その先行だけを外す。 */
export function dropPredecessorLink(
  categories: Category[],
  predecessorId: ScheduleId,
  successorId: ScheduleId,
): Category[] {
  return mapTasks(categories, (task) => {
    if (task.id !== successorId) return task;
    if (!task.predecessors.includes(predecessorId)) return task;
    return {
      ...task,
      predecessors: task.predecessors.filter((id) => id !== predecessorId),
    };
  });
}
