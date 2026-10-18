import { schedulePathKey } from "./schedulePathKey";

export type OpenWindowSnapshotEntry = {
  label: string;
  path: string | null;
  sample: boolean;
};

export type ExternalScheduleDropRoute =
  | { action: "focusExisting"; label: string }
  | { action: "openInWindow"; label: string }
  | { action: "openNewWindow" };

/**
 * アイコンやショートカットへ落とした1件のパスを、どのウィンドウで開くか決める。
 * `focusOrder` は末尾が新しい。
 */
export function routeExternalScheduleDrop(
  droppedPath: string,
  windows: readonly OpenWindowSnapshotEntry[],
  focusOrder: readonly string[],
): ExternalScheduleDropRoute {
  const key = schedulePathKey(droppedPath);
  const matchingLabels: string[] = [];
  for (const label of [...focusOrder].reverse()) {
    const entry = windows.find((window) => window.label === label);
    if (entry?.path != null && schedulePathKey(entry.path) === key) {
      matchingLabels.push(label);
    }
  }
  for (const entry of windows) {
    if (entry.path == null) continue;
    if (schedulePathKey(entry.path) !== key) continue;
    if (!matchingLabels.includes(entry.label)) {
      matchingLabels.push(entry.label);
    }
  }
  if (matchingLabels.length > 0) {
    return { action: "focusExisting", label: matchingLabels[0] };
  }

  const pathlessWindows = windows.filter((window) => window.path == null);
  if (pathlessWindows.length === 1) {
    return { action: "openInWindow", label: pathlessWindows[0].label };
  }

  return { action: "openNewWindow" };
}
