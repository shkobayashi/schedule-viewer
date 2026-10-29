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

function sortMilestones(milestones: Milestone[]): Milestone[] {
  return milestones
    .map((milestone, index) => ({ milestone, index }))
    .sort(
      (a, b) =>
        a.milestone.date.localeCompare(b.milestone.date) ||
        a.index - b.index,
    )
    .map(({ milestone }) => milestone);
}

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
    const sorted = sortMilestones(groupMilestones);
    const byCol = new Map<number, Milestone[]>();
    for (const milestone of sorted) {
      const colIndex = columnIndexForDate(columns, milestone.date);
      const list = byCol.get(colIndex) ?? [];
      list.push(milestone);
      byCol.set(colIndex, list);
    }
    const colIndices = [...byCol.keys()].sort((a, b) => a - b);
    const marks = colIndices.map((colIndex) => ({ colIndex }));
    for (const colIndex of colIndices) {
      const names = (byCol.get(colIndex) ?? [])
        .map(
          (milestone) =>
            `${milestone.confidence === "tentative" ? "◇" : "◆"} ${milestone.name}`,
        )
        .join("、");
      milestoneMarks.push({
        row: milestoneRowIndex,
        colIndex,
        character: names,
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
