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
      "設定：ステータス／メンバー／色／拡張項目の項目編集",
      "タスク詳細パネル（EDIT-04）",
      "線を引くモード（EDIT-05）",
      "絞り込みパネル（FILTER-01）",
    ]);
  });

  it("documents Esc discards hierarchy level draft without apply", () => {
    const row = MODE_KEYBOARD_REFERENCE_ROWS.find((r) =>
      r.mode.includes("EDIT-21"),
    );
    expect(row?.escape).toMatch(/適用/);
    expect(row?.escape).toMatch(/書かない/);
  });

  it("documents filter panel Esc closes list before panel", () => {
    const row = MODE_KEYBOARD_REFERENCE_ROWS.find((r) =>
      r.mode.includes("絞り込み"),
    );
    expect(row?.escape).toMatch(/候補一覧/);
    expect(row?.arrows).toMatch(/タスク選択は動かない/);
  });
});
