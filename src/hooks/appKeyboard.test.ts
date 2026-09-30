import { describe, expect, it } from "vitest";
import { decideAppKey, type AppKeyTarget } from "./appKeyboard";
import type { ChartPointer } from "../model/chartHitTest";

const pointer: ChartPointer = {
  overTask: false,
  overMilestone: false,
  link: null,
};

const field: AppKeyTarget = { tagName: "INPUT", isContentEditable: false };

function decide(
  overrides: Partial<Parameters<typeof decideAppKey>[0]> = {},
) {
  return decideAppKey({
    event: {
      key: "Escape",
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      repeat: false,
    },
    dialogOpen: false,
    menuOpen: false,
    target: null,
    linkSourceId: null,
    fileBusy: false,
    pointer,
    selectedTaskId: null,
    rowHeight: 32,
    ...overrides,
  });
}

describe("decideAppKey", () => {
  it("clears link mode on Escape and leaves a menu to close itself", () => {
    expect(decide({ linkSourceId: "task-a" }).action).toEqual({ type: "clearLink" });
    expect(decide({ menuOpen: true, linkSourceId: "task-a" }).action).toEqual({
      type: "none",
    });
    expect(decide({ menuOpen: true }).preventDefault).toBe(false);
  });

  it("deletes the hovered link before the selected task", () => {
    const link = { fromId: "from", toId: "to" };
    expect(
      decide({
        event: {
          key: "Delete",
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          repeat: false,
        },
        pointer: { overTask: false, overMilestone: false, link },
        selectedTaskId: "task-a",
      }).action,
    ).toEqual({ type: "deleteLink", fromId: "from", toId: "to" });
    expect(
      decide({
        event: {
          key: "Backspace",
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          repeat: false,
        },
        pointer: { overTask: true, overMilestone: false, link },
        selectedTaskId: "task-a",
      }).action,
    ).toEqual({ type: "deleteTask" });
  });

  it("drops file shortcuts while a file operation is busy and keeps find", () => {
    const save = decide({
      fileBusy: true,
      event: {
        key: "s",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        repeat: false,
      },
    });
    expect(save.action).toEqual({ type: "none" });
    expect(save.preventDefault).toBe(true);
    expect(
      decide({
        fileBusy: true,
        event: {
          key: "f",
          ctrlKey: true,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          repeat: false,
        },
      }).action,
    ).toEqual({ type: "find" });
  });

  it("ignores undo and redo in a dialog or text field", () => {
    const undo = {
      key: "z",
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      repeat: false,
    };
    expect(decide({ event: undo, dialogOpen: true }).action).toEqual({ type: "none" });
    expect(decide({ event: undo, target: field }).action).toEqual({ type: "none" });
    expect(decide({ event: undo }).action).toEqual({ type: "undo" });
    expect(
      decide({
        event: { ...undo, shiftKey: true },
      }).action,
    ).toEqual({ type: "redo" });
  });
});
