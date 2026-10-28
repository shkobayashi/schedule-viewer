import {
  findColorItem,
  rowFillForColorId,
  type ColorItem,
} from "../model/colorCatalog";
import type { ResolvedColorScheme } from "../model/palette";
import { BULK_COLOR_CLEAR } from "../model/bulkTaskEdit";

/** 詳細と複製で「色なし」を選ぶ `<option>` の value。一括の「変更しない」とは別である。 */
export const COLOR_NONE_VALUE = "";

export type ColorSelectOption = {
  value: string;
  label: string;
  swatchBg: string | null;
};

export function colorSelectOptionsForTask(
  colors: readonly ColorItem[],
  current: string | null,
  scheme: ResolvedColorScheme,
): ColorSelectOption[] {
  const id = current ?? null;
  const missing =
    id != null &&
    id !== "" &&
    findColorItem(colors, id) === undefined;
  const options: ColorSelectOption[] = [
    { value: COLOR_NONE_VALUE, label: "なし", swatchBg: null },
  ];
  if (missing) {
    options.push({ value: id, label: id, swatchBg: null });
  }
  for (const item of colors) {
    options.push({
      value: item.id,
      label: item.name,
      swatchBg: rowFillForColorId(colors, item.id, scheme),
    });
  }
  return options;
}

/** 複数選択の「色」。先頭は「変更しない」と「なし」。一覧に無い id は四角なしで残す。 */
export function colorSelectOptionsForBulk(
  colors: readonly ColorItem[],
  commonColorId: string | null,
  scheme: ResolvedColorScheme,
): ColorSelectOption[] {
  const missing =
    commonColorId != null &&
    commonColorId !== "" &&
    findColorItem(colors, commonColorId) === undefined;
  const opts: ColorSelectOption[] = [
    { value: "", label: "変更しない", swatchBg: null },
    { value: BULK_COLOR_CLEAR, label: "なし", swatchBg: null },
  ];
  if (missing) {
    opts.push({ value: commonColorId, label: commonColorId, swatchBg: null });
  }
  for (const item of colors) {
    opts.push({
      value: item.id,
      label: item.name,
      swatchBg: rowFillForColorId(colors, item.id, scheme),
    });
  }
  return opts;
}

/**
 * 色の選択肢。先頭は「なし」。一覧に無い `colorId` を持つタスクでも、今の値を選択肢に残す。
 */
export function ColorOptions({
  colors,
  current,
}: {
  colors: readonly ColorItem[];
  current?: string | null;
}) {
  const id = current ?? null;
  const missing =
    id != null &&
    id !== "" &&
    findColorItem(colors, id) === undefined;
  return (
    <>
      <option value={COLOR_NONE_VALUE}>なし</option>
      {missing ? <option value={id}>{id}</option> : null}
      {colors.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </>
  );
}
