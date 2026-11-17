import { useCallback, useState } from "react";
import {
  emptyTaskSelection,
  extendSelectionByArrow,
  moveSelectionByArrow,
  primarySelectedTaskId,
  selectTaskClick,
  selectTaskContextMenu,
  singleTaskSelection,
  type TaskClickModifiers,
  type TaskSelectionState,
} from "../../model/taskSelection";
import type { ScheduleId, VisibleRow } from "../../model/types";

export function useScheduleSelection() {
  const [taskSelection, setTaskSelection] = useState<TaskSelectionState>(
    () => emptyTaskSelection(),
  );
  const selectedTaskIds = taskSelection.ids;
  const selectedTaskId = primarySelectedTaskId(taskSelection);

  const selectTask = useCallback((id: ScheduleId | null) => {
    setTaskSelection(id == null ? emptyTaskSelection() : singleTaskSelection(id));
  }, []);

  const selectTaskWithClick = useCallback(
    (
      id: ScheduleId,
      mod: TaskClickModifiers,
      visibleIds: ScheduleId[],
      commandKey: boolean,
    ) => {
      setTaskSelection((prev) =>
        selectTaskClick(visibleIds, prev, id, mod, commandKey),
      );
    },
    [],
  );

  const selectTaskFromContextMenu = useCallback((id: ScheduleId) => {
    setTaskSelection((prev) => selectTaskContextMenu(prev, id));
  }, []);

  const navigateTaskSelection = useCallback(
    (
      rows: VisibleRow[],
      direction: "prev" | "next",
      extend: boolean,
      onAfter?: (next: TaskSelectionState) => void,
    ) => {
      setTaskSelection((prev) => {
        const next = extend
          ? extendSelectionByArrow(rows, prev, direction)
          : moveSelectionByArrow(rows, prev, direction);
        onAfter?.(next);
        return next;
      });
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setTaskSelection(emptyTaskSelection());
  }, []);

  return {
    taskSelection,
    setTaskSelection,
    selectedTaskIds,
    selectedTaskId,
    selectTask,
    selectTaskWithClick,
    selectTaskFromContextMenu,
    navigateTaskSelection,
    clearSelection,
  };
}
