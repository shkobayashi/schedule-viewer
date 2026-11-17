export const CATALOG_WORKSPACE_EDIT_ID = "__workspace__";

export type CatalogEditorOverlayMode = "app" | "workspace";

export function canEditCatalogItems(
  mode: CatalogEditorOverlayMode,
  editingCatalogId: string | null,
): boolean {
  if (mode === "workspace") {
    return editingCatalogId === CATALOG_WORKSPACE_EDIT_ID;
  }
  return editingCatalogId != null;
}

export function catalogExportSuggestedName(
  editingCatalogId: string | null,
  fallback: string,
): string {
  if (editingCatalogId == null || editingCatalogId === CATALOG_WORKSPACE_EDIT_ID) {
    return fallback;
  }
  return editingCatalogId;
}

export type CatalogEditorKeySnapshot = {
  modalOpen: boolean;
  composing: boolean;
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
};

export type CatalogEditorKeyAction =
  | "cancel-confirm"
  | "undo"
  | "redo"
  | "close"
  | "trap-tab"
  | "ignore";

export function catalogEditorKeyAction(
  snapshot: CatalogEditorKeySnapshot,
): CatalogEditorKeyAction {
  if (snapshot.modalOpen) {
    if (snapshot.key === "Escape") {
      return "cancel-confirm";
    }
    return "ignore";
  }
  if (snapshot.key === "Escape") {
    return "close";
  }
  if (snapshot.key === "Tab") {
    return "trap-tab";
  }
  if (snapshot.composing) {
    return "ignore";
  }
  const mod = snapshot.metaKey || snapshot.ctrlKey;
  if (mod && snapshot.key === "z" && !snapshot.altKey) {
    return snapshot.shiftKey ? "redo" : "undo";
  }
  if (
    snapshot.key === "y" &&
    snapshot.ctrlKey &&
    !snapshot.metaKey &&
    !snapshot.shiftKey &&
    !snapshot.altKey
  ) {
    return "redo";
  }
  return "ignore";
}

export function revealScrollDelta(
  scrollTop: number,
  scrollBottom: number,
  rowTop: number,
  rowBottom: number,
): number {
  if (rowTop < scrollTop) {
    return rowTop - scrollTop;
  }
  if (rowBottom > scrollBottom) {
    return rowBottom - scrollBottom;
  }
  return 0;
}

export function catalogEditorRowKey(
  persisted: boolean,
  id: string,
  index: number,
): string {
  return persisted ? id : `new-${index}`;
}

export function memberRowPersisted(
  baselineIds: ReadonlySet<string>,
  sessionNewIds: ReadonlySet<string>,
  id: string,
): boolean {
  return baselineIds.has(id) && !sessionNewIds.has(id);
}

export function baselineRowPersisted(
  savedIds: ReadonlySet<string>,
  id: string,
): boolean {
  return savedIds.has(id);
}

export function registerSessionNewId(
  sessionNewIds: ReadonlySet<string>,
  id: string,
): Set<string> {
  const next = new Set(sessionNewIds);
  next.add(id);
  return next;
}

export function replaceSessionNewId(
  sessionNewIds: ReadonlySet<string>,
  fromId: string,
  toId: string,
): Set<string> {
  if (!sessionNewIds.has(fromId)) {
    return new Set(sessionNewIds);
  }
  const next = new Set(sessionNewIds);
  next.delete(fromId);
  next.add(toId);
  return next;
}

export type CatalogDeletePolicy = "any" | "keep-last";

export function deleteControlDisabled(
  policy: CatalogDeletePolicy,
  draftLength: number,
): boolean {
  if (policy === "any") return false;
  return draftLength <= 1;
}

export function shrinkSelectionIndex(
  nextLength: number,
  rowIndex: number,
  emptyToZero: boolean,
): number {
  if (nextLength === 0) {
    return emptyToZero ? 0 : rowIndex;
  }
  return Math.min(rowIndex, nextLength - 1);
}

export function descriptionPreviewText(description: string | undefined): string {
  return (description ?? "").trim();
}
