import { parseScheduleText } from "./scheduleFile";
import type { ScheduleDocument } from "./types";

export type ExternalReloadAction =
  | { kind: "noop" }
  | { kind: "apply"; canonicalJson: string; document: ScheduleDocument }
  | { kind: "confirm"; diskContents: string }
  | { kind: "invalid"; message: string; diskContents: string };

export function decideExternalReload(
  diskContents: string,
  baselineJson: string,
  isDirty: boolean,
): ExternalReloadAction {
  const parsed = parseScheduleText(diskContents);
  if (!parsed.ok) {
    return { kind: "invalid", message: parsed.message, diskContents };
  }
  if (parsed.canonicalJson === baselineJson) {
    return { kind: "noop" };
  }
  if (isDirty) {
    return { kind: "confirm", diskContents };
  }
  return {
    kind: "apply",
    canonicalJson: parsed.canonicalJson,
    document: parsed.document,
  };
}
