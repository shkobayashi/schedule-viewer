import type { Task } from "./types";

/** パッチに `colorId` が無いときは残す。`null` はキーを外す。 */
export function applyTaskColorId(
  task: Task,
  patch: { colorId?: string | null },
): Task {
  if (!("colorId" in patch)) return task;
  if (patch.colorId == null) {
    const { colorId: _removed, ...rest } = task;
    return rest;
  }
  return { ...task, colorId: patch.colorId };
}
