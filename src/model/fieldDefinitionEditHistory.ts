import {
  cloneFieldDefinitionDrafts,
  type FieldDefinitionDraft,
} from "./fieldDefinitionEdit";
import { HISTORY_MAX } from "./history";

export type FieldDefinitionEditSnapshot = {
  drafts: FieldDefinitionDraft[];
  selectedIndex: number;
  displayName: string;
  pluginId?: string;
};

export function cloneFieldDefinitionEditSnapshot(
  snapshot: FieldDefinitionEditSnapshot,
): FieldDefinitionEditSnapshot {
  return {
    selectedIndex: snapshot.selectedIndex,
    drafts: cloneFieldDefinitionDrafts(snapshot.drafts),
    displayName: snapshot.displayName,
    ...(snapshot.pluginId !== undefined ? { pluginId: snapshot.pluginId } : {}),
  };
}

function snapshotKey(snapshot: FieldDefinitionEditSnapshot): string {
  return JSON.stringify({
    drafts: snapshot.drafts,
    selectedIndex: snapshot.selectedIndex,
    displayName: snapshot.displayName,
    pluginId: snapshot.pluginId,
  });
}

type HistoryEntry = {
  snapshot: FieldDefinitionEditSnapshot;
  key: string;
};

export type FieldDefinitionEditHistory = {
  past: HistoryEntry[];
  future: HistoryEntry[];
  presentKey: string | null;
};

export function createFieldDefinitionEditHistory(): FieldDefinitionEditHistory {
  return { past: [], future: [], presentKey: null };
}

export type PushedFieldDefinitionEditHistory = {
  history: FieldDefinitionEditHistory;
  applied: FieldDefinitionEditSnapshot | null;
};

export function pushFieldDefinitionEditHistory(
  history: FieldDefinitionEditHistory,
  current: FieldDefinitionEditSnapshot,
  next: FieldDefinitionEditSnapshot,
): PushedFieldDefinitionEditHistory | null {
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
    { snapshot: cloneFieldDefinitionEditSnapshot(current), key: currentKey },
  ];
  const trimmed =
    past.length > HISTORY_MAX ? past.slice(past.length - HISTORY_MAX) : past;
  return {
    history: { past: trimmed, future: [], presentKey: nextKey },
    applied: cloneFieldDefinitionEditSnapshot(next),
  };
}

export function undoFieldDefinitionEditHistory(
  history: FieldDefinitionEditHistory,
  current: FieldDefinitionEditSnapshot,
): { history: FieldDefinitionEditHistory; snapshot: FieldDefinitionEditSnapshot } | null {
  if (history.past.length === 0) return null;
  const entry = history.past[history.past.length - 1]!;
  const past = history.past.slice(0, -1);
  const currentKey = history.presentKey ?? snapshotKey(current);
  const future = [
    { snapshot: cloneFieldDefinitionEditSnapshot(current), key: currentKey },
    ...history.future,
  ];
  return {
    history: { past, future, presentKey: entry.key },
    snapshot: cloneFieldDefinitionEditSnapshot(entry.snapshot),
  };
}

export function redoFieldDefinitionEditHistory(
  history: FieldDefinitionEditHistory,
  current: FieldDefinitionEditSnapshot,
): { history: FieldDefinitionEditHistory; snapshot: FieldDefinitionEditSnapshot } | null {
  if (history.future.length === 0) return null;
  const entry = history.future[0]!;
  const future = history.future.slice(1);
  const currentKey = history.presentKey ?? snapshotKey(current);
  const past = [
    ...history.past,
    { snapshot: cloneFieldDefinitionEditSnapshot(current), key: currentKey },
  ];
  const trimmed =
    past.length > HISTORY_MAX ? past.slice(past.length - HISTORY_MAX) : past;
  return {
    history: { past: trimmed, future, presentKey: entry.key },
    snapshot: cloneFieldDefinitionEditSnapshot(entry.snapshot),
  };
}
