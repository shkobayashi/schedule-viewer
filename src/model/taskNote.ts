/** 保存用にノートを整形する。空白のみなら undefined（プロパティを省く）。 */
export function normalizeTaskNote(note: string | undefined): string | undefined {
  if (note == null) return undefined;
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function hasTaskNote(task: { note?: string }): boolean {
  return normalizeTaskNote(task.note) !== undefined;
}

export function applyTaskNote<T extends { note?: string }>(task: T, raw: string | undefined): T {
  const note = normalizeTaskNote(raw);
  if (note === undefined) {
    const next = { ...task };
    delete next.note;
    return next;
  }
  return { ...task, note };
}
