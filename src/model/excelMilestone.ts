import type { Milestone, MilestoneGroup } from "./types";
import type { ExcelTimeColumn } from "./excelTimeColumns";
import { columnIndexForDate } from "./excelTimeColumns";

export type ExcelMilestoneRowExport = {
  name: string;
  marks: { colIndex: number }[];
};

export type ExcelMilestoneMarkCell = {
  row: number;
  colIndex: number;
  character: string;
};

export function excelMilestoneExport(
  milestoneGroups: MilestoneGroup[],
  exportMilestones: Milestone[],
  visibleGroupIds: ReadonlySet<string>,
  columns: ExcelTimeColumn[],
): {
  milestoneRows: ExcelMilestoneRowExport[];
  milestoneMarks: ExcelMilestoneMarkCell[];
} {
  const milestoneRows: ExcelMilestoneRowExport[] = [];
  const milestoneMarks: ExcelMilestoneMarkCell[] = [];
  let milestoneRowIndex = 1;
  for (const group of milestoneGroups) {
    if (!visibleGroupIds.has(group.id)) continue;
    const groupMilestones = exportMilestones.filter(
      (m) => m.groupId === group.id,
    );
    if (groupMilestones.length === 0) continue;
    const marks = groupMilestones.map((milestone) => ({
      colIndex: columnIndexForDate(columns, milestone.date),
    }));
    for (const milestone of groupMilestones) {
      milestoneMarks.push({
        row: milestoneRowIndex,
        colIndex: columnIndexForDate(columns, milestone.date),
        character: "◆",
      });
    }
    milestoneRows.push({
      name: group.name,
      marks,
    });
    milestoneRowIndex += 1;
  }
  return { milestoneRows, milestoneMarks };
}
