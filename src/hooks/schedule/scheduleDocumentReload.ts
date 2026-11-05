import type { DocumentSnapshot } from "../../model/history";
import type { ScheduleId } from "../../model/types";

/** ディスク再読み込み後も有効なマイルストン帯グループの非表示 id だけ残す。 */
export function hiddenMilestoneGroupsAfterReload(
  hidden: readonly ScheduleId[],
  snapshot: DocumentSnapshot,
): ScheduleId[] {
  return hidden.filter((groupId) =>
    snapshot.milestoneGroups.some((group) => group.id === groupId),
  );
}

/** ディスク再読み込み後も存在するマイルストン印の非表示 id だけ残す。 */
export function hiddenMilestoneMarksAfterReload(
  hidden: readonly ScheduleId[],
  snapshot: DocumentSnapshot,
): ScheduleId[] {
  return hidden.filter((id) =>
    snapshot.milestones.some((milestone) => milestone.id === id),
  );
}
