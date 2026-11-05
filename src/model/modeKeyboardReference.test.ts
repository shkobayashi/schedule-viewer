import { describe, expect, it } from "vitest";
import {
  MODE_KEYBOARD_REFERENCE_ROWS,
  modeKeyboardReferenceRows,
} from "./modeKeyboardReference";

describe("modeKeyboardReference", () => {
  it("lists every audited in-mode surface", () => {
    const modes = modeKeyboardReferenceRows().map((row) => row.mode);
    expect(modes).toEqual([
      "階層の編集（EDIT-21）",
      "階層の名前を変更",
      "設定：項目編集（ステータス／メンバー／色／拡張）",
      "タスク詳細パネル（EDIT-04）",
      "線を引くモード（EDIT-05）",
      "絞り込みパネル（FILTER-01）",
    ]);
  });

  it("keeps table cells short and puts caveats in notes", () => {
    const row = MODE_KEYBOARD_REFERENCE_ROWS.find((r) =>
      r.mode.includes("EDIT-21"),
    );
    expect(row?.escape).toBe("閉じる");
    expect(row?.note).toMatch(/適用/);
    expect(row?.escape).not.toMatch(/下書き/);
  });

  it("documents filter panel Esc closes list before panel in the note", () => {
    const row = MODE_KEYBOARD_REFERENCE_ROWS.find((r) =>
      r.mode.includes("絞り込み"),
    );
    expect(row?.escape).toBe("閉じる");
    expect(row?.note).toMatch(/候補一覧/);
    expect(row?.note).toMatch(/タスク選択/);
  });
});
