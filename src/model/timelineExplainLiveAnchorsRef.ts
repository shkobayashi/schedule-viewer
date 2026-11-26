import type { TaskBarAnchor } from "./connections";
import type { TimelineLiveAnchor } from "./timelineLiveAnchors";
import type { ScheduleId } from "./types";

/** MCP 説明用に Timeline の liveAnchors を App の ref へ渡す（linkRight 付きを TaskBarAnchor として扱う）。 */
export function assignExplainOverlayLiveAnchorsRef(
  ref: { current: Map<ScheduleId, TaskBarAnchor> },
  liveAnchors: ReadonlyMap<ScheduleId, TimelineLiveAnchor>,
): void {
  ref.current = liveAnchors as unknown as Map<ScheduleId, TaskBarAnchor>;
}
