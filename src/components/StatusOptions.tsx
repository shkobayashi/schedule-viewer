import { statusLabel, type StatusItem } from "../model/statusCatalog";

/**
 * ステータスの選択肢。一覧に無い `id` を持つタスクでも、今の値を選択肢に残す。
 * 一覧に無い `id` は `id` をそのまま出す。
 */
export function StatusOptions({
  statuses,
  current,
}: {
  statuses: readonly StatusItem[];
  current?: string;
}) {
  const missing =
    current != null &&
    current !== "" &&
    !statuses.some((item) => item.id === current);
  return (
    <>
      {missing ? <option value={current}>{statusLabel(statuses, current)}</option> : null}
      {statuses.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </>
  );
}
