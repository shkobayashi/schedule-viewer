import { describe, expect, it } from "vitest";
import { decideAppKey, type AppKeyTarget } from "./appKeyboard";
import type { ChartPointer } from "../model/chartHitTest";

const pointer: ChartPointer = {
  overTask: false,
  overMilestone: false,
  link: null,
  hoverTaskId: null,
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
    commandPaletteOpen: false,
    macAppQuit: false,
    menuOpen: false,
    target: null,
    linkSourceId: null,
    fileBusy: false,
    pointer,
    selectedTaskId: null,
    rowHeight: 32,
    findTargetsName: true,
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
        pointer: { overTask: false, overMilestone: false, link, hoverTaskId: null },
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
        pointer: { overTask: true, overMilestone: false, link, hoverTaskId: null },
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

  it("steps display scale from a dialog, a field, or a repeat", () => {
    const plus = {
      key: "+",
      ctrlKey: true,
      metaKey: false,
      shiftKey: true,
      altKey: false,
      repeat: true,
    };
    const zoomIn = decide({
      event: plus,
      dialogOpen: true,
      target: field,
      fileBusy: true,
      linkSourceId: "task-a",
      menuOpen: true,
    });
    expect(zoomIn.action).toEqual({ type: "displayScale", direction: "in" });
    expect(zoomIn.preventDefault).toBe(true);
    expect(zoomIn.closeMenu).toBe(true);
    const zoomOut = decide({
      event: {
        key: "-",
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
        altKey: false,
        repeat: false,
      },
      target: { tagName: "BUTTON", isContentEditable: false },
    });
    expect(zoomOut.action).toEqual({ type: "displayScale", direction: "out" });
    expect(zoomOut.preventDefault).toBe(true);
    expect(zoomOut.closeMenu).toBe(true);
  });

  it("opens the note for the selected task and swallows a no-op", () => {
    const note = {
      key: "n",
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      repeat: false,
    };
    const open = decide({ event: note, selectedTaskId: "task-a" });
    expect(open.action).toEqual({ type: "note" });
    expect(open.preventDefault).toBe(true);
    expect(open.closeMenu).toBe(true);
    const missing = decide({ event: note });
    expect(missing.action).toEqual({ type: "none" });
    expect(missing.preventDefault).toBe(true);
    expect(missing.closeMenu).toBe(true);
    const linking = decide({
      event: note,
      selectedTaskId: "task-a",
      linkSourceId: "task-a",
    });
    expect(linking.action).toEqual({ type: "none" });
    expect(linking.preventDefault).toBe(true);
    const repeat = decide({
      event: { ...note, repeat: true },
      selectedTaskId: "task-a",
    });
    expect(repeat.action).toEqual({ type: "none" });
    expect(repeat.preventDefault).toBe(true);
    expect(repeat.closeMenu).toBe(true);
    const dialog = decide({
      event: note,
      dialogOpen: true,
      selectedTaskId: "task-a",
    });
    expect(dialog.action).toEqual({ type: "none" });
    expect(dialog.preventDefault).toBe(true);
    const fieldNote = decide({
      event: note,
      target: field,
      selectedTaskId: "task-a",
    });
    expect(fieldNote.action).toEqual({ type: "none" });
    expect(fieldNote.preventDefault).toBe(true);
    const busy = decide({
      event: note,
      fileBusy: true,
      selectedTaskId: "task-a",
    });
    expect(busy.action).toEqual({ type: "note" });
    const shifted = decide({
      event: { ...note, shiftKey: true },
      selectedTaskId: "task-a",
    });
    expect(shifted.action).toEqual({ type: "none" });
    expect(shifted.preventDefault).toBe(false);
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
