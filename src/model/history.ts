import { scheduleToJson } from "./serialize";
import { cloneCategories } from "./tasks";
import type { Category, Milestone, MilestoneGroup } from "./types";

export const HISTORY_MAX = 100;

export type DocumentSnapshot = {
  categories: Category[];
  milestoneGroups: MilestoneGroup[];
  milestones: Milestone[];
};

export function cloneSnapshot(snapshot: DocumentSnapshot): DocumentSnapshot {
  return {
    categories: cloneCategories(snapshot.categories),
    milestoneGroups: snapshot.milestoneGroups.map((group) => ({ ...group })),
    milestones: snapshot.milestones.map((milestone) => ({ ...milestone })),
  };
}

function snapshotKey(snapshot: DocumentSnapshot): string {
  return JSON.stringify(
    scheduleToJson(
      "",
      snapshot.categories,
      snapshot.milestoneGroups,
      snapshot.milestones,
    ),
  );
}

export function snapshotsEqual(
  a: DocumentSnapshot,
  b: DocumentSnapshot,
): boolean {
  return snapshotKey(a) === snapshotKey(b);
}

type HistoryEntry = {
  snapshot: DocumentSnapshot;
  key: string;
};

export type DocumentHistory = {
  past: HistoryEntry[];
  future: HistoryEntry[];
  /** いま画面にある文書の保存形式。無いときは次の比較で一度だけ作る。 */
  presentKey: string | null;
};

export function createDocumentHistory(): DocumentHistory {
  return { past: [], future: [], presentKey: null };
}

export type PushedDocumentHistory = {
  history: DocumentHistory;
  /** 同じ内容のときは null。画面の文書は変えない。 */
  applied: DocumentSnapshot | null;
};

export function pushDocumentHistory(
  history: DocumentHistory,
  current: DocumentSnapshot,
  next: DocumentSnapshot,
): PushedDocumentHistory | null {
  const nextKey = snapshotKey(next);
  const currentKey = history.presentKey ?? snapshotKey(current);
  if (nextKey === currentKey) {
    if (history.presentKey != null) return null;
    return {
      history: { ...history, presentKey: nextKey },
      applied: null,
    };
  }
  const past = [
    ...history.past,
    { snapshot: cloneSnapshot(current), key: currentKey },
  ];
  const trimmed =
    past.length > HISTORY_MAX ? past.slice(past.length - HISTORY_MAX) : past;
  return {
    history: { past: trimmed, future: [], presentKey: nextKey },
    applied: cloneSnapshot(next),
  };
}

export function undoDocumentHistory(
  history: DocumentHistory,
  current: DocumentSnapshot,
): { history: DocumentHistory; snapshot: DocumentSnapshot } | null {
  if (history.past.length === 0) return null;
  const entry = history.past[history.past.length - 1]!;
  const past = history.past.slice(0, -1);
  const currentKey = history.presentKey ?? snapshotKey(current);
  const future = [
    { snapshot: cloneSnapshot(current), key: currentKey },
    ...history.future,
  ];
  return {
    history: { past, future, presentKey: entry.key },
    snapshot: cloneSnapshot(entry.snapshot),
  };
}

export function redoDocumentHistory(
  history: DocumentHistory,
  current: DocumentSnapshot,
): { history: DocumentHistory; snapshot: DocumentSnapshot } | null {
  if (history.future.length === 0) return null;
  const entry = history.future[0]!;
  const future = history.future.slice(1);
  const currentKey = history.presentKey ?? snapshotKey(current);
  const past = [
    ...history.past,
    { snapshot: cloneSnapshot(current), key: currentKey },
  ];
  const trimmed =
    past.length > HISTORY_MAX ? past.slice(past.length - HISTORY_MAX) : past;
  return {
    history: { past: trimmed, future, presentKey: entry.key },
    snapshot: cloneSnapshot(entry.snapshot),
  };
}
