import type { SummarySpan } from "./summary";
import type { MemberId } from "./memberTypes";

export type ScheduleId = string;

export const SCHEDULE_SCHEMA_VERSION = 4;

export type TaskStatus = "not-started" | "in-progress" | "done";

/** 日付を合意したかどうか。着手や進捗とは独立。 */
export type TaskConfidence = "tentative" | "committed";

export type Task = {
  id: ScheduleId;
  name: string;
  start: string;
  end: string;
  assigneeId: MemberId | null;
  status: TaskStatus;
  progress: number;
  confidence: TaskConfidence;
  /** このタスクの開始前に終わる先行タスク。後続は他タスクの predecessors から導く。 */
  predecessors: ScheduleId[];
  /** このタスクが間に合わせるマイルストン。未設定なら超過判定しない。 */
  milestoneId: ScheduleId | null;
  /** 補足説明。未設定または空白のみのときは JSON に含めない。 */
  note?: string;
};

/** タスクではない到達点。期間は持たず、日付だけが決まる。 */
export type Milestone = {
  id: ScheduleId;
  name: string;
  date: string;
};

export type ScheduleDocument = {
  schemaVersion: typeof SCHEDULE_SCHEMA_VERSION;
  title: string;
  milestones: Milestone[];
  categories: Category[];
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

export type ConfidenceFilter = "all" | TaskConfidence;

export type OverdueFilter = "all" | "overdue";

export type RelationFilter = "all" | "broken";

/** フィルタ値。実データの空文字とは分ける。 */
export const UNASSIGNED_FILTER = "unassigned";

export const UNASSIGNED_LABEL = "割り当てなし";

/** マイルストン未設定タスクのみに絞るフィルタ値（UUID と区別する）。 */
export const NO_MILESTONE_FILTER = "none";

export function isNullAssignee(assigneeId: MemberId | null): boolean {
  return assigneeId == null;
}

export type ScheduleFilters = {
  /** "all" | "unassigned" | メンバー id */
  assignee: string;
  status: StatusFilter;
  confidence: ConfidenceFilter;
  overdue: OverdueFilter;
  relation: RelationFilter;
  /** "all" | "none" | マイルストン id */
  milestone: string;
  search: string;
  noteSearch: string;
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
