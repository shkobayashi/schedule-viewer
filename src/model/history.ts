import { scheduleToJson } from "../sample/schedule";
import { cloneCategories } from "./tasks";
import type { Category, Milestone } from "./types";

export const HISTORY_MAX = 100;

export type DocumentSnapshot = {
  categories: Category[];
  milestones: Milestone[];
};

export function cloneSnapshot(snapshot: DocumentSnapshot): DocumentSnapshot {
  return {
    categories: cloneCategories(snapshot.categories),
    milestones: snapshot.milestones.map((milestone) => ({ ...milestone })),
  };
}

function snapshotKey(snapshot: DocumentSnapshot): string {
  return JSON.stringify(
    scheduleToJson("", snapshot.categories, snapshot.milestones),
  );
}

export function snapshotsEqual(
  a: DocumentSnapshot,
  b: DocumentSnapshot,
): boolean {
  return snapshotKey(a) === snapshotKey(b);
}

export type DocumentHistory = {
  past: DocumentSnapshot[];
  future: DocumentSnapshot[];
};

export function createDocumentHistory(): DocumentHistory {
  return { past: [], future: [] };
}

export function pushDocumentHistory(
  history: DocumentHistory,
  current: DocumentSnapshot,
  next: DocumentSnapshot,
): { history: DocumentHistory; applied: DocumentSnapshot } | null {
  if (snapshotsEqual(current, next)) return null;
  const past = [...history.past, cloneSnapshot(current)];
  const trimmed =
    past.length > HISTORY_MAX ? past.slice(past.length - HISTORY_MAX) : past;
  return {
    history: { past: trimmed, future: [] },
    applied: cloneSnapshot(next),
  };
}

export function undoDocumentHistory(
  history: DocumentHistory,
  current: DocumentSnapshot,
): { history: DocumentHistory; snapshot: DocumentSnapshot } | null {
  if (history.past.length === 0) return null;
  const snapshot = history.past[history.past.length - 1]!;
  const past = history.past.slice(0, -1);
  const future = [cloneSnapshot(current), ...history.future];
  return {
    history: { past, future },
    snapshot: cloneSnapshot(snapshot),
  };
}

export function redoDocumentHistory(
  history: DocumentHistory,
  current: DocumentSnapshot,
): { history: DocumentHistory; snapshot: DocumentSnapshot } | null {
  if (history.future.length === 0) return null;
  const snapshot = history.future[0]!;
  const future = history.future.slice(1);
  const past = [...history.past, cloneSnapshot(current)];
  const trimmed =
    past.length > HISTORY_MAX ? past.slice(past.length - HISTORY_MAX) : past;
  return {
    history: { past: trimmed, future },
    snapshot: cloneSnapshot(snapshot),
  };
}
