import { HISTORY_MAX } from "./history";
import type { StatusItem } from "./statusCatalog";
import { statusesToJson } from "./statusEdit";

export type StatusCatalogEditSnapshot = {
  items: StatusItem[];
  selectedId: string | null;
};

export function cloneStatusCatalogEditSnapshot(
  snapshot: StatusCatalogEditSnapshot,
): StatusCatalogEditSnapshot {
  return {
    selectedId: snapshot.selectedId,
    items: snapshot.items.map((item) => ({
      ...item,
      color: {
        light: { ...item.color.light },
        dark: { ...item.color.dark },
      },
    })),
  };
}

function snapshotKey(snapshot: StatusCatalogEditSnapshot): string {
  return `${statusesToJson(snapshot.items)}\0${snapshot.selectedId ?? ""}`;
}

type HistoryEntry = {
  snapshot: StatusCatalogEditSnapshot;
  key: string;
};

export type StatusCatalogEditHistory = {
  past: HistoryEntry[];
  future: HistoryEntry[];
  presentKey: string | null;
};

export function createStatusCatalogEditHistory(): StatusCatalogEditHistory {
  return { past: [], future: [], presentKey: null };
}

export type PushedStatusCatalogEditHistory = {
  history: StatusCatalogEditHistory;
  applied: StatusCatalogEditSnapshot | null;
};

export function pushStatusCatalogEditHistory(
  history: StatusCatalogEditHistory,
  current: StatusCatalogEditSnapshot,
  next: StatusCatalogEditSnapshot,
): PushedStatusCatalogEditHistory | null {
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
    { snapshot: cloneStatusCatalogEditSnapshot(current), key: currentKey },
  ];
  const trimmed =
    past.length > HISTORY_MAX ? past.slice(past.length - HISTORY_MAX) : past;
  return {
    history: { past: trimmed, future: [], presentKey: nextKey },
    applied: cloneStatusCatalogEditSnapshot(next),
  };
}

export function undoStatusCatalogEditHistory(
  history: StatusCatalogEditHistory,
  current: StatusCatalogEditSnapshot,
): { history: StatusCatalogEditHistory; snapshot: StatusCatalogEditSnapshot } | null {
  if (history.past.length === 0) return null;
  const entry = history.past[history.past.length - 1]!;
  const past = history.past.slice(0, -1);
  const currentKey = history.presentKey ?? snapshotKey(current);
  const future = [
    { snapshot: cloneStatusCatalogEditSnapshot(current), key: currentKey },
    ...history.future,
  ];
  return {
    history: { past, future, presentKey: entry.key },
    snapshot: cloneStatusCatalogEditSnapshot(entry.snapshot),
  };
}

export function redoStatusCatalogEditHistory(
  history: StatusCatalogEditHistory,
  current: StatusCatalogEditSnapshot,
): { history: StatusCatalogEditHistory; snapshot: StatusCatalogEditSnapshot } | null {
  if (history.future.length === 0) return null;
  const entry = history.future[0]!;
  const future = history.future.slice(1);
  const currentKey = history.presentKey ?? snapshotKey(current);
  const past = [
    ...history.past,
    { snapshot: cloneStatusCatalogEditSnapshot(current), key: currentKey },
  ];
  const trimmed =
    past.length > HISTORY_MAX ? past.slice(past.length - HISTORY_MAX) : past;
  return {
    history: { past: trimmed, future, presentKey: entry.key },
    snapshot: cloneStatusCatalogEditSnapshot(entry.snapshot),
  };
}

export function selectedIndexForSnapshot(
  snapshot: StatusCatalogEditSnapshot,
): number {
  if (snapshot.items.length === 0) return 0;
  if (snapshot.selectedId == null) return 0;
  const index = snapshot.items.findIndex((item) => item.id === snapshot.selectedId);
  return index >= 0 ? index : 0;
}
