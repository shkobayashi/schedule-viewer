import { useCallback, useMemo, useState } from "react";
import {
  lineageTaskIdsFromTasks,
  lineageTaskIdsFromTasksWithConnections,
} from "../../model/dependencies";
import { collectTasksFromDocument, findTaskInDocument } from "../../model/hierarchy";
import type { DocumentSnapshot } from "../../model/history";
import { SCHEDULE_SCHEMA_VERSION, type Category, type Milestone, type MilestoneGroup, type OutlineRoot, type ScheduleId, type ScheduleLevelDef, type TaskConnection } from "../../model/types";
import { nextLineageToggleState } from "./scheduleLineageToggle";

export type UseScheduleLineageParams = {
  documentRef: { current: DocumentSnapshot };
  title: string;
  categories: Category[];
  milestoneGroups: MilestoneGroup[];
  milestones: Milestone[];
  levels: ScheduleLevelDef[] | undefined;
  outline: OutlineRoot | undefined;
  connections: TaskConnection[] | undefined;
  selectedTaskId: ScheduleId | null;
  clearExplanationOnHumanViewChange: () => void;
};

export function useScheduleLineage({
  documentRef,
  title,
  categories,
  milestoneGroups,
  milestones,
  levels,
  outline,
  connections,
  selectedTaskId,
  clearExplanationOnHumanViewChange,
}: UseScheduleLineageParams) {
  const [lineageTaskId, setLineageTaskId] = useState<ScheduleId | null>(null);
  const [lineageIncludesConnections, setLineageIncludesConnections] =
    useState(false);

  const lineageIds = useMemo(() => {
    if (lineageTaskId == null) return null;
    const tasks = collectTasksFromDocument({
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title,
      categories,
      milestoneGroups,
      milestones,
      levels,
      outline,
    });
    return lineageIncludesConnections
      ? lineageTaskIdsFromTasksWithConnections(
          tasks,
          documentRef.current.connections,
          lineageTaskId,
        )
      : lineageTaskIdsFromTasks(tasks, lineageTaskId);
  }, [
    categories,
    connections,
    documentRef,
    lineageIncludesConnections,
    lineageTaskId,
    levels,
    milestoneGroups,
    milestones,
    outline,
    title,
  ]);

  const lineageTask = useMemo(
    () => findTaskInDocument(categories, outline, lineageTaskId),
    [categories, lineageTaskId, outline],
  );

  const toggleLineage = useCallback(() => {
    clearExplanationOnHumanViewChange();
    const next = nextLineageToggleState(
      lineageTaskId,
      lineageIncludesConnections,
      selectedTaskId,
    );
    setLineageTaskId(next.lineageTaskId);
    setLineageIncludesConnections(next.lineageIncludesConnections);
  }, [
    clearExplanationOnHumanViewChange,
    lineageIncludesConnections,
    lineageTaskId,
    selectedTaskId,
  ]);

  const showLineage = useCallback(
    (taskId: ScheduleId) => {
      clearExplanationOnHumanViewChange();
      setLineageIncludesConnections(false);
      setLineageTaskId(taskId);
    },
    [clearExplanationOnHumanViewChange],
  );

  const showLineageWithConnections = useCallback(
    (taskId: ScheduleId) => {
      clearExplanationOnHumanViewChange();
      if (lineageTaskId === taskId) {
        setLineageIncludesConnections(true);
        return;
      }
      setLineageTaskId(taskId);
      setLineageIncludesConnections(true);
    },
    [clearExplanationOnHumanViewChange, lineageTaskId],
  );

  const clearLineage = useCallback(() => {
    clearExplanationOnHumanViewChange();
    setLineageTaskId(null);
    setLineageIncludesConnections(false);
  }, [clearExplanationOnHumanViewChange]);

  return {
    lineageTaskId,
    setLineageTaskId,
    lineageIncludesConnections,
    setLineageIncludesConnections,
    lineageIds,
    lineageTask,
    toggleLineage,
    showLineage,
    showLineageWithConnections,
    clearLineage,
  };
}
