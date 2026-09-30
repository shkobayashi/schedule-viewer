import { daysBetween, isIsoDateString, parseDate } from "./dates";
import { forEachTask, mapTasks } from "./tasks";
import type { Category, Milestone, ScheduleId } from "./types";

const ORIGIN = parseDate("2020-01-01");

export function validateNewMilestone(input: {
  name: string;
  date: string;
}): string | null {
  if (!input.name.trim()) return "名前を入力してください";
  if (!isIsoDateString(input.date)) return "日付を入力してください";
  return null;
}

export function appendMilestone(
  milestones: Milestone[],
  milestone: Milestone,
): Milestone[] {
  return [...milestones, milestone];
}

export function milestoneLinkedByAnyTask(
  categories: Category[],
  milestoneId: ScheduleId,
): boolean {
  let linked = false;
  forEachTask(categories, (task) => {
    if (task.milestoneId === milestoneId) linked = true;
  });
  return linked;
}

export function removeMilestone(
  categories: Category[],
  milestones: Milestone[],
  milestoneId: ScheduleId,
): { categories: Category[]; milestones: Milestone[] } {
  return {
    categories: mapTasks(categories, (task) =>
      task.milestoneId === milestoneId ? { ...task, milestoneId: null } : task,
    ),
    milestones: milestones.filter((item) => item.id !== milestoneId),
  };
}

export function milestoneFilterAfterDelete(
  current: string,
  deletedId: ScheduleId,
): string {
  return current === deletedId ? "all" : current;
}

/** 対応マイルストンがあり、完了予定日がその日付より後のときだけ超過。 */
export function milestonesExceededBy(
  task: { end: string; milestoneId: ScheduleId | null },
  milestones: Milestone[],
): Milestone[] {
  if (task.milestoneId == null) return [];
  const milestone = milestones.find((item) => item.id === task.milestoneId);
  if (!milestone || task.end <= milestone.date) return [];
  return [milestone];
}

export function milestoneLabelWidth(name: string, fontSize: number): number {
  let width = 0;
  for (const ch of name) {
    width += ch.charCodeAt(0) > 0xff ? fontSize : fontSize * 0.62;
  }
  return width;
}

/** 日付とラベル幅から、重ならない段を割り当てる。横スクロールでは段が変わらない。 */
export function milestoneBandHeightPx(
  milestones: Milestone[],
  pxPerDay: number,
  fontSize: number,
  diamondSize: number,
  laneHeight: number,
): number {
  if (milestones.length === 0) return 0;
  const lanes = layoutMilestones(milestones, pxPerDay, fontSize, diamondSize);
  return (Math.max(...lanes.values(), 0) + 1) * laneHeight;
}

export function layoutMilestones(
  milestones: Milestone[],
  pxPerDay: number,
  fontSize: number,
  diamondSize: number,
): Map<ScheduleId, number> {
  const sorted = [...milestones].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  const freeLanes: number[] = [];
  const active: Array<{ end: number; lane: number }> = [];
  let nextLane = 0;
  const lanes = new Map<ScheduleId, number>();
  const dayWidth = Math.max(pxPerDay, 0.5);
  for (const milestone of sorted) {
    const day = daysBetween(ORIGIN, parseDate(milestone.date));
    const span =
      (diamondSize + 6 + milestoneLabelWidth(milestone.name, fontSize) + 10) /
      dayWidth;
    const right = day + span;
    while (active.length > 0 && active[0]!.end <= day) {
      pushMin(freeLanes, popMinByEnd(active).lane);
    }
    const lane = freeLanes.length > 0 ? popMin(freeLanes) : nextLane++;
    pushMinByEnd(active, { end: right, lane });
    lanes.set(milestone.id, lane);
  }
  return lanes;
}

function pushMin(heap: number[], value: number): void {
  heap.push(value);
  siftUp(heap, heap.length - 1, (item) => item);
}

function popMin(heap: number[]): number {
  return popMinBy(heap, (item) => item);
}

function pushMinByEnd(
  heap: Array<{ end: number; lane: number }>,
  value: { end: number; lane: number },
): void {
  heap.push(value);
  siftUp(heap, heap.length - 1, (item) => item.end);
}

function popMinByEnd(
  heap: Array<{ end: number; lane: number }>,
): { end: number; lane: number } {
  return popMinBy(heap, (item) => item.end);
}

function siftUp<T>(heap: T[], index: number, key: (item: T) => number): void {
  let i = index;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (key(heap[parent]!) <= key(heap[i]!)) break;
    const current = heap[i]!;
    heap[i] = heap[parent]!;
    heap[parent] = current;
    i = parent;
  }
}

function popMinBy<T>(heap: T[], key: (item: T) => number): T {
  const top = heap[0]!;
  const last = heap.pop()!;
  if (heap.length === 0) return top;
  heap[0] = last;
  let i = 0;
  for (;;) {
    const left = i * 2 + 1;
    const right = left + 1;
    let smallest = i;
    if (left < heap.length && key(heap[left]!) < key(heap[smallest]!)) {
      smallest = left;
    }
    if (right < heap.length && key(heap[right]!) < key(heap[smallest]!)) {
      smallest = right;
    }
    if (smallest === i) break;
    const current = heap[i]!;
    heap[i] = heap[smallest]!;
    heap[smallest] = current;
    i = smallest;
  }
  return top;
}
