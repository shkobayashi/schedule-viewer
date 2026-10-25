import {
  NEUTRAL_STATUS_COLOR,
  STATUSES_SCHEMA_VERSION,
  normalizeStatusItem,
  type StatusItem,
} from "./statusCatalog";
import {
  formatStatusesValidationErrors,
  validateStatuses,
} from "./validateStatuses";

/** 新しい項目。`id` は一覧の中で重複しない `status-N`。 */
export function newStatusItem(items: readonly StatusItem[]): StatusItem {
  const used = new Set(items.map((item) => item.id));
  let n = items.length + 1;
  while (used.has(`status-${n}`)) n += 1;
  return {
    id: `status-${n}`,
    name: "新しいステータス",
    color: {
      light: { ...NEUTRAL_STATUS_COLOR.light },
      dark: { ...NEUTRAL_STATUS_COLOR.dark },
    },
    role: "started",
    description: "",
  };
}

function serializeStatusItem(item: StatusItem): Record<string, unknown> {
  const normalized = normalizeStatusItem(item);
  const payload: Record<string, unknown> = {
    id: normalized.id,
    name: normalized.name,
    color: normalized.color,
    role: normalized.role,
    description: normalized.description,
  };
  if (normalized.instruction) {
    payload.instruction = normalized.instruction;
  }
  return payload;
}

export function updateStatusItem(
  items: readonly StatusItem[],
  index: number,
  patch: Partial<Omit<StatusItem, "color">> & {
    color?: Partial<{
      light: Partial<StatusItem["color"]["light"]>;
      dark: Partial<StatusItem["color"]["dark"]>;
    }>;
  },
): StatusItem[] {
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

/** 並びを `delta` だけ動かす。端を越えるときは変えない。 */
export function moveStatusItem(
  items: readonly StatusItem[],
  index: number,
  delta: -1 | 1,
): StatusItem[] {
  const to = index + delta;
  if (to < 0 || to >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(to, 0, moved);
  return next;
}

/** 項目を外す。最後の1件は外さない。 */
export function removeStatusItem(
  items: readonly StatusItem[],
  index: number,
): StatusItem[] {
  if (items.length <= 1) return [...items];
  return items.filter((_, i) => i !== index);
}

/** 既存の ID とぶつからない一覧 ID。 */
export function nextStatusCatalogId(
  existingIds: readonly string[],
  base = "custom",
): string {
  const used = new Set(existingIds);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function statusesToJson(items: readonly StatusItem[]): string {
  const doc = {
    schemaVersion: STATUSES_SCHEMA_VERSION,
    statuses: items.map((item) => serializeStatusItem(item)),
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

/** 保存できる形か。できなければ画面に出す文言を返す。 */
export function statusDraftError(items: readonly StatusItem[]): string | null {
  const result = validateStatuses({
    schemaVersion: STATUSES_SCHEMA_VERSION,
    statuses: items,
  });
  return result.ok ? null : formatStatusesValidationErrors(result.errors);
}

export function sameStatusItems(
  a: readonly StatusItem[],
  b: readonly StatusItem[],
): boolean {
  return statusesToJson(a) === statusesToJson(b);
}

/** 説明が空白のとき、保存と書き出しを止める理由。 */
export function statusDescriptionErrorAt(
  items: readonly StatusItem[],
  index: number,
): string | null {
  const item = items[index];
  if (!item || item.description.trim().length > 0) return null;
  return "説明は空白にできません";
}
