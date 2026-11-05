export type BaselineDiffClassification =
  | "画面のみ"
  | "ファイルのみ"
  | "同じ"
  | "異なる"
  | "削除と変更"
  | "追加と削除";

export type BaselineClassificationLine = {
  label: BaselineDiffClassification;
  headline: string;
};

export function isBaselineConflictLabel(
  label: BaselineDiffClassification,
): boolean {
  return (
    label === "異なる" ||
    label === "削除と変更" ||
    label === "追加と削除"
  );
}
