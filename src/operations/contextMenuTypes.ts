import type { ReactNode } from "react";
import type { ScheduleId } from "../model/types";

export type ContextMenuItem =
  | {
      type: "item";
      id: string;
      label: string;
      shortcut?: string;
      icon?: ReactNode;
      danger?: boolean;
      onSelect: () => void;
    }
  | { type: "separator"; id: string };

export type ContextMenuTarget =
  | { kind: "task"; taskId: ScheduleId }
  | { kind: "milestone"; milestoneId: ScheduleId }
  | { kind: "category"; id: ScheduleId }
  | { kind: "group"; id: ScheduleId }
  | { kind: "hierarchy"; id: ScheduleId }
  | {
      kind: "link";
      fromId: ScheduleId;
      toId: ScheduleId;
      linkKind: "predecessor" | "connection";
    }
  | {
      kind: "addMilestone";
      date: string;
      groupId: ScheduleId | null;
    }
  | { kind: "milestoneGroup"; groupId: ScheduleId };

export type ContextMenuState = ContextMenuTarget & { x: number; y: number };

export function contextMenuTarget(state: ContextMenuState): ContextMenuTarget {
  switch (state.kind) {
    case "task":
      return { kind: "task", taskId: state.taskId };
    case "milestone":
      return { kind: "milestone", milestoneId: state.milestoneId };
    case "category":
      return { kind: "category", id: state.id };
    case "group":
      return { kind: "group", id: state.id };
    case "hierarchy":
      return { kind: "hierarchy", id: state.id };
    case "link":
      return {
        kind: "link",
        fromId: state.fromId,
        toId: state.toId,
        linkKind: state.linkKind,
      };
    case "addMilestone":
      return {
        kind: "addMilestone",
        date: state.date,
        groupId: state.groupId,
      };
    case "milestoneGroup":
      return { kind: "milestoneGroup", groupId: state.groupId };
  }
}
