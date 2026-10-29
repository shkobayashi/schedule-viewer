import { HISTORY_MAX } from "./history";
import type { Member } from "./memberTypes";
import { membersToJson } from "./memberEdit";

export type MemberCatalogEditSnapshot = {
  items: Member[];
  selectedId: string | null;
};

export function cloneMemberCatalogEditSnapshot(
  snapshot: MemberCatalogEditSnapshot,
): MemberCatalogEditSnapshot {
  return {
    selectedId: snapshot.selectedId,
    items: snapshot.items.map((item) => ({ ...item })),
  };
}

function snapshotKey(snapshot: MemberCatalogEditSnapshot): string {
  return `${membersToJson(snapshot.items)}\0${snapshot.selectedId ?? ""}`;
}

type HistoryEntry = {
  snapshot: MemberCatalogEditSnapshot;
  key: string;
};

export type MemberCatalogEditHistory = {
  past: HistoryEntry[];
  future: HistoryEntry[];
  presentKey: string | null;
};

export function createMemberCatalogEditHistory(): MemberCatalogEditHistory {
  return { past: [], future: [], presentKey: null };
}

export type PushedMemberCatalogEditHistory = {
  history: MemberCatalogEditHistory;
  applied: MemberCatalogEditSnapshot | null;
};

export function pushMemberCatalogEditHistory(
  history: MemberCatalogEditHistory,
  current: MemberCatalogEditSnapshot,
  next: MemberCatalogEditSnapshot,
): PushedMemberCatalogEditHistory | null {
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
    { snapshot: cloneMemberCatalogEditSnapshot(current), key: currentKey },
  ];
  const trimmed =
    past.length > HISTORY_MAX ? past.slice(past.length - HISTORY_MAX) : past;
  return {
    history: { past: trimmed, future: [], presentKey: nextKey },
    applied: cloneMemberCatalogEditSnapshot(next),
  };
}

export function undoMemberCatalogEditHistory(
  history: MemberCatalogEditHistory,
  current: MemberCatalogEditSnapshot,
): { history: MemberCatalogEditHistory; snapshot: MemberCatalogEditSnapshot } | null {
  if (history.past.length === 0) return null;
  const entry = history.past[history.past.length - 1]!;
  const past = history.past.slice(0, -1);
  const future = [
    { snapshot: cloneMemberCatalogEditSnapshot(current), key: snapshotKey(current) },
    ...history.future,
  ];
  return {
    history: {
      past,
      future,
      presentKey: entry.key,
    },
    snapshot: cloneMemberCatalogEditSnapshot(entry.snapshot),
  };
}

export function redoMemberCatalogEditHistory(
  history: MemberCatalogEditHistory,
  current: MemberCatalogEditSnapshot,
): { history: MemberCatalogEditHistory; snapshot: MemberCatalogEditSnapshot } | null {
  if (history.future.length === 0) return null;
  const entry = history.future[0]!;
  const future = history.future.slice(1);
  const past = [
    ...history.past,
    { snapshot: cloneMemberCatalogEditSnapshot(current), key: snapshotKey(current) },
  ];
  return {
    history: {
      past,
      future,
      presentKey: snapshotKey(entry.snapshot),
    },
    snapshot: cloneMemberCatalogEditSnapshot(entry.snapshot),
  };
}

export function selectedIndexForMemberSnapshot(
  snapshot: MemberCatalogEditSnapshot,
): number {
  if (snapshot.selectedId == null) return 0;
  const index = snapshot.items.findIndex((item) => item.id === snapshot.selectedId);
  return index >= 0 ? index : 0;
}
