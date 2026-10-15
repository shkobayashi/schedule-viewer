import {
  cloneSnapshot,
  snapshotsEqual,
  type DocumentSnapshot,
} from "./history";

export type BaselineMergeDeferredTracking = {
  diskContents: string;
  beforeMerge: DocumentSnapshot;
  afterMerge: DocumentSnapshot;
};

export function createBaselineMergeDeferredTracking(
  beforeMerge: DocumentSnapshot,
  afterMerge: DocumentSnapshot,
  diskContents: string,
): BaselineMergeDeferredTracking {
  return {
    diskContents,
    beforeMerge: cloneSnapshot(beforeMerge),
    afterMerge: cloneSnapshot(afterMerge),
  };
}

export function shouldRestoreExternalReloadBanner(
  tracking: BaselineMergeDeferredTracking | null,
  landedSnapshot: DocumentSnapshot,
): boolean {
  if (tracking == null) return false;
  return snapshotsEqual(landedSnapshot, tracking.beforeMerge);
}

export function shouldClearExternalReloadBanner(
  tracking: BaselineMergeDeferredTracking | null,
  landedSnapshot: DocumentSnapshot,
): boolean {
  if (tracking == null) return false;
  return snapshotsEqual(landedSnapshot, tracking.afterMerge);
}
