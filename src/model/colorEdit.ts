import {
  COLORS_SCHEMA_VERSION,
  DEFAULT_NEW_COLOR_DARK_BG,
  DEFAULT_NEW_COLOR_LIGHT_BG,
  type ColorItem,
} from "./colorCatalog";
import {
  formatColorsValidationErrors,
  validateColors,
} from "./validateColors";

const MAX_COLOR_ITEMS = 8;

/** 新しい項目。`id` は一覧の中で重複しない `color-N`。 */
export function newColorItem(items: readonly ColorItem[]): ColorItem {
  const used = new Set(items.map((item) => item.id));
  let n = items.length + 1;
  while (used.has(`color-${n}`)) n += 1;
  return {
    id: `color-${n}`,
    name: "新しい色",
    color: {
      light: { bg: DEFAULT_NEW_COLOR_LIGHT_BG },
      dark: { bg: DEFAULT_NEW_COLOR_DARK_BG },
    },
    description: "",
  };
}

export function updateColorItem(
  items: readonly ColorItem[],
  index: number,
  patch: Partial<Omit<ColorItem, "color">> & {
    color?: Partial<{
      light: Partial<ColorItem["color"]["light"]>;
      dark: Partial<ColorItem["color"]["dark"]>;
    }>;
  },
): ColorItem[] {
  return items.map((item, i) => {
    if (i !== index) return item;
    const { color, ...rest } = patch;
    return {
      ...item,
      ...rest,
      color: {
        light: { ...item.color.light, ...color?.light },
        dark: { ...item.color.dark, ...color?.dark },
      },
    };
  });
}

export function moveColorItem(
  items: readonly ColorItem[],
  index: number,
  delta: -1 | 1,
): ColorItem[] {
  const to = index + delta;
  if (to < 0 || to >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(to, 0, moved);
  return next;
}

/** 項目を外す。最後の1件は外さない。 */
export function removeColorItem(
  items: readonly ColorItem[],
  index: number,
): ColorItem[] {
  if (items.length <= 1) return [...items];
  return items.filter((_, i) => i !== index);
}

export function canAddColorItem(items: readonly ColorItem[]): boolean {
  return items.length < MAX_COLOR_ITEMS;
}

/** 既存の ID とぶつからない一覧 ID。 */
export function nextColorCatalogId(
  existingIds: readonly string[],
  base = "custom",
): string {
  const used = new Set(existingIds);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function colorsToJson(items: readonly ColorItem[]): string {
  const doc = {
    schemaVersion: COLORS_SCHEMA_VERSION,
    colors: items.map((item) => ({
      id: item.id,
      name: item.name,
      color: item.color,
      description: item.description,
    })),
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

export function colorDraftError(items: readonly ColorItem[]): string | null {
  const result = validateColors({
    schemaVersion: COLORS_SCHEMA_VERSION,
    colors: [...items],
  });
  return result.ok ? null : formatColorsValidationErrors(result.errors);
}

export function sameColorItems(
  a: readonly ColorItem[],
  b: readonly ColorItem[],
): boolean {
  return colorsToJson(a) === colorsToJson(b);
}

export function colorDescriptionErrorAt(
  items: readonly ColorItem[],
  index: number,
): string | null {
  const item = items[index];
  if (!item || item.description.trim().length > 0) return null;
  return "説明は空白にできません";
}
