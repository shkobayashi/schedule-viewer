import type { ScheduleId } from "./types";

/** カテゴリ・グループ付きのタスク参照（依存関係 UI 等）。 */
export type TaskRef = {
  id: ScheduleId;
  name: string;
  category: string;
  group: string;
};
