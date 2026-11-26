import { visibleConnectionsFromTasks } from "./connections";
import { paletteFor } from "./palette";
import type { ScheduleId, TaskConnection } from "./types";

export type ExcelConnectionCurveDescriptor = {
  fromShapeIndex: number;
  toShapeIndex: number;
  strokeRgb: string;
  label: string;
  labelTextRgb: string;
};

export function excelConnectionCurveStrokeRgb(): string {
  const { chart } = paletteFor("light");
  return chart.connectionArc.replace("#", "");
}

export function excelConnectionCurveLabelTextRgb(): string {
  const { chart } = paletteFor("light");
  return chart.connectionArcLabel.replace("#", "");
}

export function excelConnectionCurvesForExport(
  connections: readonly TaskConnection[] | undefined,
  visibleIds: ReadonlySet<ScheduleId>,
  taskShapeIndexById: ReadonlyMap<ScheduleId, number>,
): ExcelConnectionCurveDescriptor[] {
  const strokeRgb = excelConnectionCurveStrokeRgb();
  const labelTextRgb = excelConnectionCurveLabelTextRgb();
  const curves: ExcelConnectionCurveDescriptor[] = [];
  for (const connection of visibleConnectionsFromTasks(
    connections,
    visibleIds,
  )) {
    const [fromId, toId] = connection.taskIds;
    const fromShapeIndex = taskShapeIndexById.get(fromId);
    const toShapeIndex = taskShapeIndexById.get(toId);
    if (fromShapeIndex == null || toShapeIndex == null) continue;
    curves.push({
      fromShapeIndex,
      toShapeIndex,
      strokeRgb,
      label: connection.label,
      labelTextRgb,
    });
  }
  return curves;
}
