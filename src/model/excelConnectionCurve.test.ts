import { describe, expect, it } from "vitest";
import {
  excelConnectionCurveLabelTextRgb,
  excelConnectionCurveStrokeRgb,
  excelConnectionCurvesForExport,
} from "./excelConnectionCurve";
import { paletteFor } from "./palette";
import type { ScheduleId, TaskConnection } from "./types";

const TASK_A = "a" as ScheduleId;
const TASK_B = "b" as ScheduleId;
const TASK_C = "c" as ScheduleId;

describe("excelConnectionCurvesForExport", () => {
  it("includes a visible connection curve", () => {
    const connections: TaskConnection[] = [
      { taskIds: [TASK_A, TASK_B], label: "関係" },
    ];
    const shapeIndex = new Map<ScheduleId, number>([
      [TASK_A, 0],
      [TASK_B, 1],
    ]);
    const curves = excelConnectionCurvesForExport(
      connections,
      new Set([TASK_A, TASK_B]),
      shapeIndex,
    );
    expect(curves).toEqual([
      {
        fromShapeIndex: 0,
        toShapeIndex: 1,
        strokeRgb: "0369A1",
        label: "関係",
        labelTextRgb: "075985",
      },
    ]);
  });

  it("omits a connection when one task is hidden", () => {
    const connections: TaskConnection[] = [
      { taskIds: [TASK_A, TASK_B], label: "関係" },
    ];
    const shapeIndex = new Map<ScheduleId, number>([
      [TASK_A, 0],
      [TASK_B, 1],
    ]);
    expect(
      excelConnectionCurvesForExport(
        connections,
        new Set([TASK_A]),
        shapeIndex,
      ),
    ).toEqual([]);
  });

  it("uses light arc color when the app is dark", () => {
    expect(excelConnectionCurveStrokeRgb()).toBe(
      paletteFor("light").chart.connectionArc.replace("#", ""),
    );
    expect(excelConnectionCurveStrokeRgb()).toBe("0369A1");
    expect(excelConnectionCurveStrokeRgb()).not.toBe(
      paletteFor("dark").chart.connectionArc.replace("#", ""),
    );
  });

  it("includes the connection label", () => {
    const connections: TaskConnection[] = [
      { taskIds: [TASK_A, TASK_B], label: "表示される言葉" },
    ];
    const curves = excelConnectionCurvesForExport(
      connections,
      new Set([TASK_A, TASK_B]),
      new Map([
        [TASK_A, 0],
        [TASK_B, 1],
      ]),
    );
    expect(curves[0]?.label).toBe("表示される言葉");
  });

  it("uses light label color when the app is dark", () => {
    expect(excelConnectionCurveLabelTextRgb()).toBe(
      paletteFor("light").chart.connectionArcLabel.replace("#", ""),
    );
    expect(excelConnectionCurveLabelTextRgb()).toBe("075985");
    expect(excelConnectionCurveLabelTextRgb()).not.toBe(
      paletteFor("dark").chart.connectionArcLabel.replace("#", ""),
    );
  });

  it("skips curves when a shape index is missing", () => {
    const connections: TaskConnection[] = [
      { taskIds: [TASK_A, TASK_C], label: "関係" },
    ];
    expect(
      excelConnectionCurvesForExport(
        connections,
        new Set([TASK_A, TASK_C]),
        new Map([[TASK_A, 0]]),
      ),
    ).toEqual([]);
  });
});
