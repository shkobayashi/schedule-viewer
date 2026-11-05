import { describe, expect, it } from "vitest";
import type { CommandPaletteCommandId } from "../model/commandPalette";
import { OPERATION_FORMAL } from "../model/operationLabels";
import {
  CONTEXT_MENU_FIXED_LABEL,
  OPERATION_FORMAL_LINK,
  contextMenuLabel,
} from "./operationLabelLink";
import {
  COMMAND_PALETTE_OPERATION_IDS,
  OPERATION_ID,
  type OperationId,
} from "./operationIds";

describe("operationLabelLink", () => {
  it("maps shared operation IDs to OPERATION_FORMAL", () => {
    for (const [operationId, formalKey] of Object.entries(
      OPERATION_FORMAL_LINK,
    )) {
      expect(contextMenuLabel(operationId as OperationId)).toBe(
        OPERATION_FORMAL[formalKey as keyof typeof OPERATION_FORMAL],
      );
    }
  });

  it("keeps fixed context-menu labels from operation-entries", () => {
    expect(CONTEXT_MENU_FIXED_LABEL[OPERATION_ID.hideMilestoneMark]).toBe(
      "非表示",
    );
    expect(CONTEXT_MENU_FIXED_LABEL[OPERATION_ID.unlinkPredecessor]).toBe(
      "線を外す",
    );
    expect(CONTEXT_MENU_FIXED_LABEL[OPERATION_ID.unlinkConnection]).toBe(
      "繋がりを外す",
    );
  });

  it("keeps dynamic labels", () => {
    expect(
      contextMenuLabel(OPERATION_ID.toggleTaskConfidence, { tentative: true }),
    ).toBe("確定にする");
    expect(
      contextMenuLabel(OPERATION_ID.toggleLineage, { lineageActive: false }),
    ).toBe(OPERATION_FORMAL.lineageShow);
    expect(
      contextMenuLabel(OPERATION_ID.addOutlineSibling, { levelName: "章" }),
    ).toBe("下に章を追加");
  });

  it("aligns command palette IDs with OPERATION_ID values", () => {
    for (const id of COMMAND_PALETTE_OPERATION_IDS) {
      expect(id).toBe(OPERATION_ID[id as keyof typeof OPERATION_ID]);
      const paletteId = id as CommandPaletteCommandId;
      expect(paletteId).toBe(id);
    }
  });
});
