import { useCallback, useMemo, useState } from "react";
import {
  addDays,
  clamp,
  isoDate,
  parseDate,
} from "../model/dates";
import { lineageTaskIds } from "../model/dependencies";
import { computeVisibleRows, findTaskById } from "../model/rows";
import { cloneCategories, mapTasks } from "../model/tasks";
import type {
  Category,
  Milestone,
  ScheduleFilters,
  Task,
} from "../model/types";
import { collectAssignees } from "../sample/schedule";

export function useSchedule(
  initialCategories: Category[],
  initialMilestones: Milestone[],
  rowHeight: number,
  bodyHeight: number,
) {
  const [categories, setCategories] = useState(() =>
    cloneCategories(initialCategories),
  );
  const [milestones, setMilestones] = useState(() =>
    initialMilestones.map((milestone) => ({ ...milestone })),
  );
  const [editingMilestoneId, setEditingMilestoneId] = useState<number | null>(
    null,
  );
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [lineageTaskId, setLineageTaskId] = useState<number | null>(null);
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

  const lineageIds = useMemo(
    () =>
      lineageTaskId == null
        ? null
        : lineageTaskIds(categories, lineageTaskId),
    [categories, lineageTaskId],
  );

  const visibleRows = useMemo(
    () =>
      computeVisibleRows(categories, filters, collapsed, rowHeight, lineageIds),
    [categories, collapsed, filters, lineageIds, rowHeight],
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

  const toggleLineage = useCallback(() => {
    setLineageTaskId((current) => (current == null ? selectedTaskId : null));
  }, [selectedTaskId]);

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

  const moveMilestoneByDays = useCallback((id: number, deltaDays: number) => {
    if (deltaDays === 0) return;
    setMilestones((prev) =>
      prev.map((milestone) =>
        milestone.id === id
          ? {
              ...milestone,
              date: isoDate(addDays(parseDate(milestone.date), deltaDays)),
            }
          : milestone,
      ),
    );
  }, []);

  const openMilestoneEdit = useCallback((id: number) => {
    setEditingMilestoneId(id);
  }, []);

  const closeMilestoneEdit = useCallback(() => {
    setEditingMilestoneId(null);
  }, []);

  const saveMilestoneEdit = useCallback(
    (patch: { name: string; date: string }) => {
      if (!patch.date || editingMilestoneId == null) return false;
      setMilestones((prev) =>
        prev.map((milestone) =>
          milestone.id === editingMilestoneId
            ? {
                ...milestone,
                name: patch.name.trim() || milestone.name,
                date: patch.date,
              }
            : milestone,
        ),
      );
      setEditingMilestoneId(null);
      return true;
    },
    [editingMilestoneId],
  );

  const editingMilestone = useMemo(
    () => milestones.find((milestone) => milestone.id === editingMilestoneId) ?? null,
    [editingMilestoneId, milestones],
  );

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
      milestoneId: number | null;
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
              milestoneId:
                patch.milestoneId != null &&
                milestones.some((milestone) => milestone.id === patch.milestoneId)
                  ? patch.milestoneId
                  : null,
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
    [editingTaskId, milestones],
  );

  const editingTask = useMemo(
    () => findTaskById(categories, editingTaskId),
    [categories, editingTaskId],
  );

  const lineageTask = useMemo(
    () => findTaskById(categories, lineageTaskId),
    [categories, lineageTaskId],
  );

  return {
    categories,
    milestones,
    editingMilestone,
    moveMilestoneByDays,
    openMilestoneEdit,
    closeMilestoneEdit,
    saveMilestoneEdit,
    assignees,
    visibleRows,
    toggleCollapsed,
    filters,
    updateFilters,
    selectedTaskId,
    selectTask,
    clearSelection,
    lineageTask,
    toggleLineage,
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
