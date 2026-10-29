import { HISTORY_MAX } from "./history";
import type { ColorItem } from "./colorCatalog";
import { colorsToJson } from "./colorEdit";

export type ColorCatalogEditSnapshot = {
  items: ColorItem[];
  selectedId: string | null;
};

export function cloneColorCatalogEditSnapshot(
  snapshot: ColorCatalogEditSnapshot,
): ColorCatalogEditSnapshot {
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

function snapshotKey(snapshot: ColorCatalogEditSnapshot): string {
  return `${colorsToJson(snapshot.items)}\0${snapshot.selectedId ?? ""}`;
}

type HistoryEntry = {
  snapshot: ColorCatalogEditSnapshot;
  key: string;
};

export type ColorCatalogEditHistory = {
  past: HistoryEntry[];
  future: HistoryEntry[];
  presentKey: string | null;
};

export function createColorCatalogEditHistory(): ColorCatalogEditHistory {
  return { past: [], future: [], presentKey: null };
}

export type PushedColorCatalogEditHistory = {
  history: ColorCatalogEditHistory;
  applied: ColorCatalogEditSnapshot | null;
};

export function pushColorCatalogEditHistory(
  history: ColorCatalogEditHistory,
  current: ColorCatalogEditSnapshot,
  next: ColorCatalogEditSnapshot,
): PushedColorCatalogEditHistory | null {
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
    { snapshot: cloneColorCatalogEditSnapshot(current), key: currentKey },
  ];
  const trimmed =
    past.length > HISTORY_MAX ? past.slice(past.length - HISTORY_MAX) : past;
  return {
    history: { past: trimmed, future: [], presentKey: nextKey },
    applied: cloneColorCatalogEditSnapshot(next),
  };
}

export function undoColorCatalogEditHistory(
  history: ColorCatalogEditHistory,
  current: ColorCatalogEditSnapshot,
): { history: ColorCatalogEditHistory; snapshot: ColorCatalogEditSnapshot } | null {
  if (history.past.length === 0) return null;
  const entry = history.past[history.past.length - 1]!;
  const past = history.past.slice(0, -1);
  const future = [
    { snapshot: cloneColorCatalogEditSnapshot(current), key: snapshotKey(current) },
    ...history.future,
  ];
  return {
    history: {
      past,
      future,
      presentKey: entry.key,
    },
    snapshot: cloneColorCatalogEditSnapshot(entry.snapshot),
  };
}

export function redoColorCatalogEditHistory(
  history: ColorCatalogEditHistory,
  current: ColorCatalogEditSnapshot,
): { history: ColorCatalogEditHistory; snapshot: ColorCatalogEditSnapshot } | null {
  if (history.future.length === 0) return null;
  const entry = history.future[0]!;
  const future = history.future.slice(1);
  const past = [
    ...history.past,
    { snapshot: cloneColorCatalogEditSnapshot(current), key: snapshotKey(current) },
  ];
  return {
    history: {
      past,
      future,
      presentKey: snapshotKey(entry.snapshot),
    },
    snapshot: cloneColorCatalogEditSnapshot(entry.snapshot),
  };
}

export function selectedIndexForColorSnapshot(
  snapshot: ColorCatalogEditSnapshot,
): number {
  if (snapshot.selectedId == null) return 0;
  const index = snapshot.items.findIndex((item) => item.id === snapshot.selectedId);
  return index >= 0 ? index : 0;
}
