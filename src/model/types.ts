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

export type Category = {
  name: string;
  tasks: Task[];
};

export type StatusFilter = "all" | "not-done" | TaskStatus;

export type OverdueFilter = "all" | "overdue";

export type RelationFilter = "all" | "broken";

export type ScheduleFilters = {
  assignee: string;
  status: StatusFilter;
  overdue: OverdueFilter;
  relation: RelationFilter;
  search: string;
};

export type VisibleRow =
  | { type: "category"; label: string; y: number }
  | { type: "task"; task: Task; y: number };
