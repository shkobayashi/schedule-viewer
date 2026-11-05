import { lineageTaskIdsFromTasks } from "../../model/dependencies";
import { collectTasksFromDocument } from "../../model/hierarchy";
import type { DocumentSnapshot } from "../../model/history";
import {
  pruneTaskSelection,
  type TaskSelectionState,
} from "../../model/taskSelection";
import { SCHEDULE_SCHEMA_VERSION, type ScheduleId } from "../../model/types";

export type PruneSelectionLineageResult = {
  taskSelection: TaskSelectionState;
  lineageTaskId: ScheduleId | null;
  clearLineageIncludesConnections: boolean;
};

export function pruneSelectionAndLineageForDocument(
  snapshot: DocumentSnapshot,
  currentSelection: TaskSelectionState,
  currentLineageTaskId: ScheduleId | null,
): PruneSelectionLineageResult {
  const taskSelection = pruneTaskSelection(
    snapshot.categories,
    snapshot.outline,
    currentSelection,
  );
  if (currentLineageTaskId == null) {
    return {
      taskSelection,
      lineageTaskId: null,
      clearLineageIncludesConnections: false,
    };
  }
  const tasks = collectTasksFromDocument({
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: snapshot.title,
    categories: snapshot.categories,
    milestoneGroups: snapshot.milestoneGroups,
    milestones: snapshot.milestones,
    levels: snapshot.levels,
    outline: snapshot.outline,
  });
  const ok = lineageTaskIdsFromTasks(tasks, currentLineageTaskId);
  return {
    taskSelection,
    lineageTaskId: ok ? currentLineageTaskId : null,
    clearLineageIncludesConnections: !ok,
  };
}
