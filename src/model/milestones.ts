import { daysBetween, isIsoDateString, parseDate } from "./dates";
import { forEachTask, mapTasks } from "./tasks";
import type {
  Category,
  Milestone,
  MilestoneGroup,
  ScheduleId,
} from "./types";

const ORIGIN = parseDate("2020-01-01");

export const DEFAULT_MILESTONE_GROUP_NAME = "マイルストン";

/** ひし形の右端から名前の左端までの空き。画面と書き出しの文字もこの値。 */
export const MILESTONE_LABEL_GAP = 5;

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

export function truncateMilestoneLabel(
  name: string,
  maxWidthPx: number,
  fontSize: number,
): string {
  if (maxWidthPx <= 0) return "";
  const fullWidth = milestoneLabelWidth(name, fontSize);
  if (fullWidth <= maxWidthPx) return name;
  const ellipsis = "…";
  const ellipsisWidth = milestoneLabelWidth(ellipsis, fontSize);
  let width = 0;
  let out = "";
  for (const ch of name) {
    const chWidth = ch.charCodeAt(0) > 0xff ? fontSize : fontSize * 0.62;
    if (width + chWidth + ellipsisWidth > maxWidthPx) break;
    out += ch;
    width += chWidth;
  }
  return out.length > 0 ? `${out}${ellipsis}` : ellipsis;
}

export type MilestoneLayoutMode = "screen" | "export";

export type MilestoneBandBlockLayout = {
  group: MilestoneGroup;
  offsetY: number;
  height: number;
  milestones: Milestone[];
  lanes: Map<ScheduleId, number>;
  displayLabels: Map<ScheduleId, string>;
  centerYById: Map<ScheduleId, number>;
};

export type MilestoneBandLayout = {
  blocks: MilestoneBandBlockLayout[];
  totalHeight: number;
  centerYById: Map<ScheduleId, number>;
  displayLabels: Map<ScheduleId, string>;
};

type Interval = { start: number; end: number; lane: number };

function dayIndex(date: string): number {
  return daysBetween(ORIGIN, parseDate(date));
}

function diamondInterval(
  day: number,
  diamondSize: number,
  pxPerDay: number,
): { start: number; end: number } {
  const dayWidth = Math.max(pxPerDay, 0.5);
  const half = diamondSize / 2 / dayWidth;
  return { start: day - half, end: day + half };
}

function exportInterval(
  day: number,
  name: string,
  diamondSize: number,
  fontSize: number,
  pxPerDay: number,
): { start: number; end: number } {
  const dayWidth = Math.max(pxPerDay, 0.5);
  const half = diamondSize / 2 / dayWidth;
  const textEnd =
    day +
    (diamondSize / 2 +
      MILESTONE_LABEL_GAP +
      milestoneLabelWidth(name, fontSize)) /
      dayWidth;
  return { start: day - half, end: Math.max(day + half, textEnd) };
}

function layoutLanesByIntervals(
  sorted: Milestone[],
  intervalFor: (milestone: Milestone) => { start: number; end: number },
): Map<ScheduleId, number> {
  const freeLanes: number[] = [];
  const active: Interval[] = [];
  let nextLane = 0;
  const lanes = new Map<ScheduleId, number>();

  const release = (end: number) => {
    while (active.length > 0 && active[0]!.end <= end) {
      pushMin(freeLanes, popMinByEnd(active).lane);
    }
  };

  for (const milestone of sorted) {
    const { start, end } = intervalFor(milestone);
    release(start);
    const lane = freeLanes.length > 0 ? popMin(freeLanes) : nextLane++;
    pushMinByEnd(active, { start, end, lane });
    lanes.set(milestone.id, lane);
  }
  return lanes;
}

function sortMilestones(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
}

export function layoutMilestonesInGroup(
  milestones: Milestone[],
  pxPerDay: number,
  fontSize: number,
  diamondSize: number,
  mode: MilestoneLayoutMode,
): Map<ScheduleId, number> {
  const sorted = sortMilestones(milestones);
  if (mode === "export") {
    return layoutLanesByIntervals(sorted, (milestone) =>
      exportInterval(
        dayIndex(milestone.date),
        milestone.name,
        diamondSize,
        fontSize,
        pxPerDay,
      ),
    );
  }
  return layoutLanesByIntervals(sorted, (milestone) =>
    diamondInterval(dayIndex(milestone.date), diamondSize, pxPerDay),
  );
}

function displayLabelsForScreen(
  milestones: Milestone[],
  lanes: Map<ScheduleId, number>,
  diamondSize: number,
  fontSize: number,
  dateToDayX: (day: number) => number,
): Map<ScheduleId, string> {
  const labels = new Map<ScheduleId, string>();
  const byLane = new Map<number, Milestone[]>();
  for (const milestone of milestones) {
    const lane = lanes.get(milestone.id) ?? 0;
    const list = byLane.get(lane) ?? [];
    list.push(milestone);
    byLane.set(lane, list);
  }
  for (const list of byLane.values()) {
    const sorted = sortMilestones(list);
    for (let i = 0; i < sorted.length; i += 1) {
      const milestone = sorted[i]!;
      const x = dateToDayX(dayIndex(milestone.date));
      const next = sorted[i + 1];
      let maxWidth = Number.POSITIVE_INFINITY;
      if (next) {
        const nextX = dateToDayX(dayIndex(next.date));
        maxWidth = Math.max(
          0,
          nextX - x - diamondSize - MILESTONE_LABEL_GAP,
        );
      }
      labels.set(
        milestone.id,
        truncateMilestoneLabel(milestone.name, maxWidth, fontSize),
      );
    }
  }
  return labels;
}

export function layoutMilestoneBand(
  milestoneGroups: MilestoneGroup[],
  milestones: Milestone[],
  visibleGroupIds: ReadonlySet<ScheduleId>,
  pxPerDay: number,
  fontSize: number,
  diamondSize: number,
  laneHeight: number,
  mode: MilestoneLayoutMode,
): MilestoneBandLayout {
  const blocks: MilestoneBandBlockLayout[] = [];
  const centerYById = new Map<ScheduleId, number>();
  const displayLabels = new Map<ScheduleId, string>();
  let offsetY = 0;

  const dateToDayX = (day: number) => day * Math.max(pxPerDay, 0.5);

  for (const group of milestoneGroups) {
    if (!visibleGroupIds.has(group.id)) continue;
    const groupMilestones = milestones.filter(
      (item) => item.groupId === group.id,
    );
    if (groupMilestones.length === 0) continue;
    const lanes = layoutMilestonesInGroup(
      groupMilestones,
      pxPerDay,
      fontSize,
      diamondSize,
      mode,
    );
    const laneCount = Math.max(...lanes.values(), 0) + 1;
    const height = laneCount * laneHeight;
    const blockLabels =
      mode === "screen"
        ? displayLabelsForScreen(
            groupMilestones,
            lanes,
            diamondSize,
            fontSize,
            dateToDayX,
          )
        : new Map(
            groupMilestones.map((milestone) => [milestone.id, milestone.name]),
          );
    const blockCenterY = new Map<ScheduleId, number>();
    for (const milestone of groupMilestones) {
      const lane = lanes.get(milestone.id) ?? 0;
      const centerY = offsetY + lane * laneHeight + laneHeight / 2;
      blockCenterY.set(milestone.id, centerY);
      centerYById.set(milestone.id, centerY);
      displayLabels.set(milestone.id, blockLabels.get(milestone.id) ?? milestone.name);
    }
    blocks.push({
      group,
      offsetY,
      height,
      milestones: groupMilestones,
      lanes,
      displayLabels: blockLabels,
      centerYById: blockCenterY,
    });
    offsetY += height;
  }

  return { blocks, totalHeight: offsetY, centerYById, displayLabels };
}

export function milestoneBandHeightPx(
  milestoneGroups: MilestoneGroup[],
  milestones: Milestone[],
  visibleGroupIds: ReadonlySet<ScheduleId>,
  pxPerDay: number,
  fontSize: number,
  diamondSize: number,
  laneHeight: number,
  mode: MilestoneLayoutMode = "screen",
): number {
  return layoutMilestoneBand(
    milestoneGroups,
    milestones,
    visibleGroupIds,
    pxPerDay,
    fontSize,
    diamondSize,
    laneHeight,
    mode,
  ).totalHeight;
}

/** @deprecated 書き出しの単一ブロック用。layoutMilestoneBand を使う。 */
export function layoutMilestones(
  milestones: Milestone[],
  pxPerDay: number,
  fontSize: number,
  diamondSize: number,
  mode: MilestoneLayoutMode = "export",
): Map<ScheduleId, number> {
  const pseudoGroup: MilestoneGroup = {
    id: "00000000-0000-4000-8000-000000000000",
    name: "",
  };
  const layout = layoutMilestoneBand(
    [pseudoGroup],
    milestones.map((milestone) => ({ ...milestone, groupId: pseudoGroup.id })),
    new Set([pseudoGroup.id]),
    pxPerDay,
    fontSize,
    diamondSize,
    1,
    mode,
  );
  const lanes = new Map<ScheduleId, number>();
  const block = layout.blocks[0];
  if (block) {
    for (const [id, lane] of block.lanes) lanes.set(id, lane);
  }
  return lanes;
}

export function milestoneGroupIdAtBandY(
  blocks: MilestoneBandBlockLayout[],
  y: number,
): ScheduleId | null {
  for (const block of blocks) {
    if (y >= block.offsetY && y < block.offsetY + block.height) {
      return block.group.id;
    }
  }
  return null;
}

export function applyMilestoneEdit(
  milestones: Milestone[],
  milestoneId: ScheduleId,
  milestoneGroups: MilestoneGroup[],
  patch: {
    name: string;
    date: string;
    confidence: Milestone["confidence"];
    groupId: ScheduleId;
  },
): Milestone[] {
  const validGroupIds = new Set(milestoneGroups.map((group) => group.id));
  return milestones.map((milestone) => {
    if (milestone.id !== milestoneId) return milestone;
    const groupId = validGroupIds.has(patch.groupId)
      ? patch.groupId
      : milestone.groupId;
    return {
      ...milestone,
      name: patch.name.trim() || milestone.name,
      date: patch.date,
      confidence: patch.confidence,
      groupId,
    };
  });
}

export function ensureMilestoneGroupForAdd(
  milestoneGroups: MilestoneGroup[],
  taken: ReadonlySet<ScheduleId>,
  createId: () => ScheduleId,
  preferredGroupId?: ScheduleId | null,
): { milestoneGroups: MilestoneGroup[]; groupId: ScheduleId } {
  if (milestoneGroups.length > 0) {
    const groupId =
      preferredGroupId != null &&
      milestoneGroups.some((group) => group.id === preferredGroupId)
        ? preferredGroupId
        : milestoneGroups[0]!.id;
    return { milestoneGroups, groupId };
  }
  let id = createId();
  while (taken.has(id)) id = createId();
  const group: MilestoneGroup = { id, name: DEFAULT_MILESTONE_GROUP_NAME };
  return { milestoneGroups: [group], groupId: id };
}

function pushMin(heap: number[], value: number): void {
  heap.push(value);
  siftUp(heap, heap.length - 1, (item) => item);
}

function popMin(heap: number[]): number {
  return popMinBy(heap, (item) => item);
}

function pushMinByEnd(heap: Interval[], value: Interval): void {
  heap.push(value);
  siftUp(heap, heap.length - 1, (item) => item.end);
}

function popMinByEnd(heap: Interval[]): Interval {
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
