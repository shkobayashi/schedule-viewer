import type { ExplanationViewState } from "./explainView";
import type {
  Category,
  Milestone,
  MilestoneGroup,
  OutlineRoot,
  ScheduleId,
  VisibleRow,
} from "./types";

export type ExplanationMarkKind = "change" | "ask";

export type ExplanationMark = {
  taskId?: ScheduleId;
  date?: string;
  milestoneId?: ScheduleId;
  milestoneGroupId?: ScheduleId;
  kind: ExplanationMarkKind;
  label: string;
  number?: number;
  /** Normalized `#rrggbb` when the caller set `color`. */
  color?: string;
};

export type ExplainOverlayValidationContext = {
  categories: Category[];
  outline: OutlineRoot | undefined;
  milestones: readonly Milestone[];
  milestoneGroups: readonly MilestoneGroup[];
  hiddenMilestoneGroupIds: readonly ScheduleId[];
  explanationView?: ExplanationViewState | null;
  collapsed: ReadonlySet<string>;
  visibleRows: readonly VisibleRow[];
};
