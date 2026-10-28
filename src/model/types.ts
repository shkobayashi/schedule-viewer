import type { FieldFiltersState } from "./fieldFilters";
import type { SummarySpan } from "./summary";
import type { MemberId } from "./memberTypes";

export type ScheduleLevelDef = {
  name: string;
  meaning: string;
  instruction?: string;
};

export type OutlineBranch = {
  id: ScheduleId;
  name: string;
  children: OutlineChild[];
};

export type OutlineChild = OutlineBranch | Task;

export type OutlineRoot = OutlineChild[];

export type HierarchyRowKind = "top" | "middle" | "taskParent";

export type ScheduleId = string;

export const SCHEDULE_SCHEMA_VERSION = 8;

/** マイルストン帯の行。タスクのカテゴリ・グループとは別。 */
export type MilestoneGroup = {
  id: ScheduleId;
  name: string;
};

/** ステータス一覧の項目の `id`。一覧に無い値も文書には書ける。 */
export type TaskStatus = string;

/** 日付を合意したかどうか。着手や進捗とは独立。 */
export type TaskConfidence = "tentative" | "committed";

export type TaskTodoItem = {
  text: string;
  done: boolean;
};

export type ScheduleFieldType = "text" | "number" | "date" | "choice";

export type ScheduleFieldDef = {
  key: string;
  name: string;
  type: ScheduleFieldType;
  meaning?: string;
  instruction?: string;
  required?: true;
  default?: string | number;
  percent?: true;
  choices?: string[];
};

export type TaskFieldValues = Record<string, string | number>;

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
  /** 進捗を件数で決める任意の項目。1件以上あるときだけ JSON に含める。 */
  todos?: TaskTodoItem[];
  /** 説明用の任意タグ。未設定または空のときは JSON に含めない。 */
  tags?: string[];
  /** 補足説明。未設定または空白のみのときは JSON に含めない。 */
  note?: string;
  /** 追加項目の値。定義の key だけ。1件以上あるときだけ JSON に含める。 */
  fieldValues?: TaskFieldValues;
};

/** タスクではない到達点。期間は持たず、日付と確度が決まる。 */
export type Milestone = {
  id: ScheduleId;
  name: string;
  date: string;
  /** 日付を合意したかどうか。着手や進捗とは独立。 */
  confidence: TaskConfidence;
  groupId: ScheduleId;
};

export type ScheduleDocument = {
  schemaVersion: typeof SCHEDULE_SCHEMA_VERSION;
  title: string;
  milestoneGroups: MilestoneGroup[];
  milestones: Milestone[];
  categories: Category[];
  levels?: ScheduleLevelDef[];
  outline?: OutlineRoot;
};

/** カテゴリとタスクの間。日付は持たず、配下タスクのまとまり。 */
export type TaskGroup = {
  id: ScheduleId;
  name: string;
  tasks: Task[];
};

export type Category = {
  id: ScheduleId;
  name: string;
  groups: TaskGroup[];
};

/** "all"、"not-done"（完了以外）、またはステータスの `id`。 */
export type StatusFilter = string;

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
  /** 空配列はタグで絞らない。要素はファイル内のタグ名そのもの */
  tags: string[];
  search: string;
  noteSearch: string;
  /** 追加項目の key ごとの条件。効いているキーだけを持つ */
  fieldFilters?: FieldFiltersState;
};

export type VisibleRow =
  | {
      type: "category";
      id: ScheduleId;
      label: string;
      y: number;
      collapsed: boolean;
      summary: SummarySpan | null;
      /** 配下タスクの平均進捗（整数）。タスクが無いときは null。 */
      rollupPercent: number | null;
    }
  | {
      type: "group";
      id: ScheduleId;
      categoryId: ScheduleId;
      category: string;
      label: string;
      y: number;
      collapsed: boolean;
      summary: SummarySpan | null;
      /** 配下タスクの平均進捗（整数）。タスクが無いときは null。 */
      rollupPercent: number | null;
    }
  | {
      type: "hierarchy";
      id: ScheduleId;
      label: string;
      y: number;
      collapsed: boolean;
      summary: SummarySpan | null;
      rollupPercent: number | null;
      levelIndex: number;
      depth: number;
      rowKind: HierarchyRowKind;
      ancestorIds: ScheduleId[];
      /** 2 段のとき、地と帯の両方を付ける行 */
      alsoTaskParent?: boolean;
    }
  | { type: "task"; task: Task; y: number };
