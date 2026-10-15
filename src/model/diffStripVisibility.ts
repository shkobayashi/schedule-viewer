import {
  NO_OPEN_SCHEDULE_FILE_MESSAGE,
  SCHEDULE_DIFF_NO_CHANGES,
} from "./scheduleDiff";

export type DiffStripContentKind = "body" | "empty";

export type DiffStripView =
  | { visible: false }
  | {
      visible: true;
      text: string;
      kind: DiffStripContentKind;
      showClose: boolean;
    };

export function classifyDiffText(text: string): DiffStripContentKind {
  if (text === NO_OPEN_SCHEDULE_FILE_MESSAGE) {
    return "empty";
  }
  if (
    text === SCHEDULE_DIFF_NO_CHANGES ||
    text.endsWith(`\n${SCHEDULE_DIFF_NO_CHANGES}`)
  ) {
    return "empty";
  }
  return "body";
}

export function resolveStripAfterExplicitLoad(
  text: string,
): Extract<DiffStripView, { visible: true }> {
  const kind = classifyDiffText(text);
  return {
    visible: true,
    text,
    kind,
    showClose: kind === "empty",
  };
}

/** 自動読み込み後の帯。明示の空結果を出しているときは空でも帯をしまわない（null は変更なし） */
export function resolveStripAfterAutoLoad(
  text: string,
  explicitEmptyPinned: boolean,
): DiffStripView | null {
  const kind = classifyDiffText(text);
  if (kind === "body") {
    return { visible: true, text, kind, showClose: false };
  }
  if (explicitEmptyPinned) {
    return null;
  }
  return { visible: false };
}

export function shouldDeferBodyUpdate(
  current: DiffStripView,
  next: Extract<DiffStripView, { visible: true }>,
  textareaFocused: boolean,
): boolean {
  if (!textareaFocused || next.kind !== "body") {
    return false;
  }
  return current.visible && current.kind === "body";
}

export function diffStripAriaStatus(
  kind: DiffStripContentKind,
  text: string,
): string {
  if (kind === "body") {
    return "差分を表示しています";
  }
  return text;
}
