import { useCallback, useMemo, useState } from "react";
import {
  addDays,
  clamp,
  isoDate,
  parseDate,
} from "../model/dates";
import { computeVisibleRows, findTaskById } from "../model/rows";
import { cloneCategories, mapTasks } from "../model/tasks";
import type { Category, ScheduleFilters, Task } from "../model/types";
import { collectAssignees } from "../sample/schedule";

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
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const assignees = useMemo(
    () => collectAssignees(categories),
    [categories],
  );

  const visibleRows = useMemo(
    () => computeVisibleRows(categories, filters, collapsed, rowHeight),
    [categories, collapsed, filters, rowHeight],
  );

  const toggleCollapsed = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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
      mapTasks(prev, (task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          start: isoDate(addDays(parseDate(task.start), deltaDays)),
          end: isoDate(addDays(parseDate(task.end), deltaDays)),
        };
      }),
    );
  }, []);

  const setTaskStart = useCallback((taskId: number, start: string) => {
    setCategories((prev) =>
      mapTasks(prev, (task) =>
        task.id === taskId ? { ...task, start } : task,
      ),
    );
  }, []);

  const setTaskEnd = useCallback((taskId: number, end: string) => {
    setCategories((prev) =>
      mapTasks(prev, (task) => (task.id === taskId ? { ...task, end } : task)),
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
        mapTasks(prev, (task) => {
          if (task.id === editingTaskId) {
            return {
              ...task,
              name: patch.name || task.name,
              start: patch.start,
              end: patch.end,
              assignee: patch.assignee.trim(),
              status: patch.status,
              progress: clamp(patch.progress, 0, 100),
              predecessors,
            };
          }
          const withoutSelf = task.predecessors.filter(
            (id) => id !== editingTaskId,
          );
          return {
            ...task,
            predecessors: successors.has(task.id)
              ? [...withoutSelf, editingTaskId]
              : withoutSelf,
          };
        }),
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
    toggleCollapsed,
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
