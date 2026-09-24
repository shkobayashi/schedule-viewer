import type { SummarySpan } from "./summary";

export type TaskStatus = "not-started" | "in-progress" | "done";

export type Task = {
  id: number;
  name: string;
  start: string;
  end: string;
  assignee: string;
  status: TaskStatus;
  progress: number;
  /** このタスクの開始前に終わる先行タスク。後続は他タスクの predecessors から導く。 */
  predecessors: number[];
};

/** カテゴリとタスクの間。日付は持たず、配下タスクのまとまり。 */
export type TaskGroup = {
  name: string;
  tasks: Task[];
};

export type Category = {
  name: string;
  groups: TaskGroup[];
};

export type StatusFilter = "all" | "not-done" | TaskStatus;

export type OverdueFilter = "all" | "overdue";

export type RelationFilter = "all" | "broken";

/** フィルタ値。実データの空文字とは分ける。 */
export const UNASSIGNED_FILTER = "unassigned";

export const UNASSIGNED_LABEL = "割り当てなし";

export function isUnassigned(assignee: string): boolean {
  return assignee.trim() === "";
}

export type ScheduleFilters = {
  /** "all" | "unassigned" | 担当者名 */
  assignee: string;
  status: StatusFilter;
  overdue: OverdueFilter;
  relation: RelationFilter;
  search: string;
};

export type VisibleRow =
  | {
      type: "category";
      label: string;
      y: number;
      collapsed: boolean;
      summary: SummarySpan;
    }
  | {
      type: "group";
      category: string;
      label: string;
      y: number;
      collapsed: boolean;
      summary: SummarySpan;
    }
  | { type: "task"; task: Task; y: number };
