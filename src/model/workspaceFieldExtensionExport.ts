export const MAX_FIELD_EXTENSION_EXPORT_BYTES = 2 * 1024 * 1024;

export type FieldExtensionExportFile = {
  fileName: string;
  contents: string;
};

export function fieldExtensionExportFileName(catalogId: string): string {
  return `${catalogId}.fields.json`;
}

export function normalizeFieldExtensionExportContents(text: string): string {
  return text.endsWith("\n") ? text : `${text}\n`;
}

export function fieldExtensionExportTooLargeMessage(contents: string): string | null {
  if (contents.length > MAX_FIELD_EXTENSION_EXPORT_BYTES) {
    return "拡張項目 JSON が大きすぎます（上限 2 MB）";
  }
  return null;
}

/** 選択順を保ち、本文が無い ID は省く。 */
export function buildFieldExtensionExportFiles(
  selectedCatalogIds: readonly string[],
  contentsByCatalogId: Readonly<Record<string, string | null | undefined>>,
): FieldExtensionExportFile[] {
  const out: FieldExtensionExportFile[] = [];
  for (const catalogId of selectedCatalogIds) {
    const text = contentsByCatalogId[catalogId];
    if (text == null || text.length === 0) continue;
    out.push({
      fileName: fieldExtensionExportFileName(catalogId),
      contents: normalizeFieldExtensionExportContents(text),
    });
  }
  return out;
}
