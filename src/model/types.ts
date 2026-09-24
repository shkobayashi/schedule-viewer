export type TaskStatus = "not-started" | "in-progress" | "done";

export type Task = {
  id: number;
  name: string;
  start: string;
  end: string;
  assignee: string;
  status: TaskStatus;
  progress: number;
};

export type Category = {
  name: string;
  tasks: Task[];
};

export type ScheduleFilters = {
  assignee: string;
  status: string;
  search: string;
};

export type VisibleRow =
  | { type: "category"; label: string; y: number }
  | { type: "task"; task: Task; y: number };
