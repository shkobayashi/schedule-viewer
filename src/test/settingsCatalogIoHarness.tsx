import { useMemo } from "react";
import { SettingsMembersSection } from "../components/SettingsMembersSection";
import { useMemberCatalog } from "../hooks/useMemberCatalog";
import {
  assigneeSidebarLabel,
  duplicateMemberNamesFromCatalog,
  memberMapFromList,
  resolveAssigneeRowDisplay,
} from "../model/assigneeDisplay";
import { parseScheduleText } from "../model/scheduleFile";
import type { MemberId } from "../model/memberTypes";
import type { ScheduleDocument } from "../model/types";

export type SettingsCatalogIoHarnessProps = {
  scheduleText: string;
  assigneeTaskName: string;
};

export function SettingsCatalogIoHarness({
  scheduleText,
  assigneeTaskName,
}: SettingsCatalogIoHarnessProps) {
  const memberCatalog = useMemberCatalog();
  const schedule = useMemo((): ScheduleDocument | null => {
    const parsed = parseScheduleText(scheduleText);
    return parsed.ok ? parsed.document : null;
  }, [scheduleText]);
  const assigneeLabel = useMemo(() => {
    if (!schedule) return null;
    const task =
      schedule.categories
        .flatMap((category) => category.groups)
        .flatMap((group) => group.tasks)
        .find((item) => item.name === assigneeTaskName) ?? null;
    if (!task) return null;
    const catalog = memberMapFromList(memberCatalog.members);
    const duplicateNames = duplicateMemberNamesFromCatalog(catalog);
    const display = resolveAssigneeRowDisplay(
      task.assigneeIds as MemberId[],
      catalog,
      duplicateNames,
    );
    return assigneeSidebarLabel(display);
  }, [assigneeTaskName, memberCatalog.members, schedule]);

  return (
    <div>
      <SettingsMembersSection
        settings={memberCatalog.settings}
        selectedCatalogLabel={memberCatalog.selectedCatalogLabel}
        onImport={memberCatalog.importCatalog}
        onSelectCatalog={memberCatalog.selectCatalog}
        onDeleteCatalog={memberCatalog.removeCatalog}
        onOpenEditor={() => {}}
      />
      {assigneeLabel != null ? (
        <p data-testid="assignee-resolution">{assigneeLabel}</p>
      ) : null}
      {schedule ? (
        <pre data-testid="schedule-json">
          {JSON.stringify(
            {
              schemaVersion: schedule.schemaVersion,
              title: schedule.title,
              members: (schedule as { members?: unknown }).members,
            },
            null,
            2,
          )}
        </pre>
      ) : null}
    </div>
  );
}
