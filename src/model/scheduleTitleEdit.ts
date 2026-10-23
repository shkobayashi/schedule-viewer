export type ScheduleTitleCommitResult =
  | { kind: "blank" }
  | { kind: "unchanged" }
  | { kind: "changed"; title: string };

/** 確定時は前後の空白だけを除く。空白だけ、同じ文字、変わる、の3つに分ける。 */
export function resolveScheduleTitleCommit(
  currentTitle: string,
  rawInput: string,
): ScheduleTitleCommitResult {
  const trimmed = rawInput.trim();
  if (!trimmed) return { kind: "blank" };
  if (trimmed === currentTitle) return { kind: "unchanged" };
  return { kind: "changed", title: trimmed };
}
