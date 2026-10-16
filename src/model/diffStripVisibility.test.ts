import { describe, expect, it } from "vitest";
import {
  NO_OPEN_SCHEDULE_FILE_MESSAGE,
  SCHEDULE_DIFF_NO_CHANGES,
} from "./scheduleDiff";
import {
  classifyDiffText,
  diffStripAriaStatus,
  resolveStripAfterAutoLoad,
  resolveStripAfterExplicitLoad,
  shouldDeferBodyUpdate,
} from "./diffStripVisibility";

describe("classifyDiffText", () => {
  it("treats no open file message as empty", () => {
    expect(classifyDiffText(NO_OPEN_SCHEDULE_FILE_MESSAGE)).toBe("empty");
  });

  it("treats no changes header as empty", () => {
    const text = `差分（今の画面 − 開いているファイル）\nファイル: a.json\n${SCHEDULE_DIFF_NO_CHANGES}`;
    expect(classifyDiffText(text)).toBe("empty");
  });

  it("treats task change lines as body", () => {
    const text =
      "差分（今の画面 − 開いているファイル）\nファイル: a.json\n\nname: 旧 → 新";
    expect(classifyDiffText(text)).toBe("body");
  });
});

describe("resolveStripAfterExplicitLoad", () => {
  it("shows close for empty results", () => {
    expect(resolveStripAfterExplicitLoad(NO_OPEN_SCHEDULE_FILE_MESSAGE)).toEqual({
      visible: true,
      text: NO_OPEN_SCHEDULE_FILE_MESSAGE,
      kind: "empty",
      showClose: true,
    });
  });

  it("hides close for body", () => {
    const text = "差分（今の画面 − 開いているファイル）\nファイル: a.json\n\nx";
    expect(resolveStripAfterExplicitLoad(text)).toEqual({
      visible: true,
      text,
      kind: "body",
      showClose: false,
    });
  });
});

describe("resolveStripAfterAutoLoad", () => {
  it("shows body only", () => {
    const text = "差分（今の画面 − 開いているファイル）\nファイル: a.json\n\nx";
    expect(resolveStripAfterAutoLoad(text, false)).toEqual({
      visible: true,
      text,
      kind: "body",
      showClose: false,
    });
  });

  it("hides when there are no changes", () => {
    const text = `差分（今の画面 − 開いているファイル）\nファイル: a.json\n${SCHEDULE_DIFF_NO_CHANGES}`;
    expect(resolveStripAfterAutoLoad(text, false)).toEqual({ visible: false });
  });

  it("keeps strip when explicit empty is pinned", () => {
    const text = `差分（今の画面 − 開いているファイル）\nファイル: a.json\n${SCHEDULE_DIFF_NO_CHANGES}`;
    expect(resolveStripAfterAutoLoad(text, true)).toBeNull();
  });

  it("drops explicit empty when body appears", () => {
    const text = "差分（今の画面 − 開いているファイル）\nファイル: a.json\n\nx";
    expect(resolveStripAfterAutoLoad(text, true)).toEqual({
      visible: true,
      text,
      kind: "body",
      showClose: false,
    });
  });
});

describe("shouldDeferBodyUpdate", () => {
  const bodyView = {
    visible: true as const,
    text: "a",
    kind: "body" as const,
    showClose: false,
  };
  const emptyView = {
    visible: true as const,
    text: NO_OPEN_SCHEDULE_FILE_MESSAGE,
    kind: "empty" as const,
    showClose: true,
  };

  it("defers only body to body while focused", () => {
    expect(
      shouldDeferBodyUpdate(bodyView, { ...bodyView, text: "b" }, true),
    ).toBe(true);
    expect(
      shouldDeferBodyUpdate(emptyView, bodyView, true),
    ).toBe(false);
    expect(
      shouldDeferBodyUpdate(bodyView, { ...bodyView, text: "b" }, false),
    ).toBe(false);
  });
});

describe("diffStripAriaStatus", () => {
  it("announces body display", () => {
    expect(diffStripAriaStatus("body", "x")).toBe("差分を表示しています");
  });

  it("repeats empty message text", () => {
    expect(diffStripAriaStatus("empty", NO_OPEN_SCHEDULE_FILE_MESSAGE)).toBe(
      NO_OPEN_SCHEDULE_FILE_MESSAGE,
    );
  });
});
