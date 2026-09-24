import { useCallback, useMemo, useState } from "react";
import {
  addDays,
  clamp,
  isoDate,
  parseDate,
} from "../model/dates";
import { computeVisibleRows, findTaskById } from "../model/rows";
import type { Category, ScheduleFilters, Task } from "../model/types";
import { collectAssignees } from "../sample/schedule";

function cloneCategories(categories: Category[]): Category[] {
  return categories.map((c) => ({
    name: c.name,
    tasks: c.tasks.map((t) => ({ ...t })),
  }));
}

export function useSchedule(
  initialCategories: Category[],
  rowHeight: number,
  bodyHeight: number,
) {
  const [categories, setCategories] = useState(() =>
    cloneCategories(initialCategories),
  );
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [filters, setFilters] = useState<ScheduleFilters>({
    assignee: "all",
    status: "all",
    overdue: "all",
    relation: "all",
    search: "",
  });
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const assignees = useMemo(
    () => collectAssignees(categories),
    [categories],
  );

  const visibleRows = useMemo(
    () => computeVisibleRows(categories, filters, rowHeight),
    [categories, filters, rowHeight],
  );

  const updateFilters = useCallback((patch: Partial<ScheduleFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setSelectedTaskId(null);
  }, []);

  const selectTask = useCallback((id: number | null) => {
    setSelectedTaskId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const moveTaskByDays = useCallback((taskId: number, deltaDays: number) => {
    if (deltaDays === 0) return;
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            start: isoDate(addDays(parseDate(t.start), deltaDays)),
            end: isoDate(addDays(parseDate(t.end), deltaDays)),
          };
        }),
      })),
    );
  }, []);

  const setTaskStart = useCallback((taskId: number, start: string) => {
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) =>
          t.id === taskId ? { ...t, start } : t,
        ),
      })),
    );
  }, []);

  const setTaskEnd = useCallback((taskId: number, end: string) => {
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => (t.id === taskId ? { ...t, end } : t)),
      })),
    );
  }, []);

  const openEditDialog = useCallback((task: Task) => {
    setEditingTaskId(task.id);
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditingTaskId(null);
  }, []);

  const saveTaskEdit = useCallback(
    (patch: {
      name: string;
      start: string;
      end: string;
      assignee: string;
      status: Task["status"];
      progress: number;
      predecessors: number[];
      successors: number[];
    }) => {
      if (patch.end < patch.start) return false;
      if (editingTaskId == null) return false;
      const predecessors = [
        ...new Set(
          patch.predecessors.filter((id) => id !== editingTaskId),
        ),
      ];
      const successors = new Set(
        patch.successors.filter((id) => id !== editingTaskId),
      );
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          tasks: c.tasks.map((t) => {
            if (t.id === editingTaskId) {
              return {
                ...t,
                name: patch.name || t.name,
                start: patch.start,
                end: patch.end,
                assignee: patch.assignee.trim(),
                status: patch.status,
                progress: clamp(patch.progress, 0, 100),
                predecessors,
              };
            }
            const withoutSelf = t.predecessors.filter(
              (id) => id !== editingTaskId,
            );
            return {
              ...t,
              predecessors: successors.has(t.id)
                ? [...withoutSelf, editingTaskId]
                : withoutSelf,
            };
          }),
        })),
      );
      setEditingTaskId(null);
      return true;
    },
    [editingTaskId],
  );

  const editingTask = useMemo(
    () => findTaskById(categories, editingTaskId),
    [categories, editingTaskId],
  );

  return {
    categories,
    assignees,
    visibleRows,
    filters,
    updateFilters,
    selectedTaskId,
    selectTask,
    clearSelection,
    moveTaskByDays,
    setTaskStart,
    setTaskEnd,
    openEditDialog,
    closeEditDialog,
    saveTaskEdit,
    editingTask,
    maxScrollY: Math.max(0, visibleRows.length * rowHeight - bodyHeight),
  };
}
