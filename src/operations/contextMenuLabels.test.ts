import { describe, expect, it } from "vitest";
import { OPERATION_FORMAL } from "../model/operationLabels";
import {
  CONTEXT_MENU_LABEL,
  milestoneConfidenceLabel,
  taskConfidenceLabel,
  taskLineageLabel,
} from "./contextMenuLabels";

describe("contextMenuLabels", () => {
  it("aligns task menu fixed labels with OPERATION_FORMAL", () => {
    expect(CONTEXT_MENU_LABEL.edit).toBe(OPERATION_FORMAL.editTask);
    expect(CONTEXT_MENU_LABEL.delete).toBe(OPERATION_FORMAL.deleteTask);
    expect(CONTEXT_MENU_LABEL.duplicate).toBe(OPERATION_FORMAL.duplicateTask);
    expect(CONTEXT_MENU_LABEL.note).toBe(OPERATION_FORMAL.note);
    expect(CONTEXT_MENU_LABEL.addMilestone).toBe(OPERATION_FORMAL.addMilestone);
  });

  it("keeps confidence toggle wording", () => {
    expect(taskConfidenceLabel(true)).toBe("確定にする");
    expect(taskConfidenceLabel(false)).toBe("未確定にする");
    expect(milestoneConfidenceLabel(true)).toBe("確定にする");
  });

  it("keeps lineage toggle wording with palette helper", () => {
    expect(taskLineageLabel(false)).toBe(OPERATION_FORMAL.lineageShow);
    expect(taskLineageLabel(true)).toBe(OPERATION_FORMAL.lineageClear);
  });
});
