import { useCallback, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  collisionAfterExtensionSave,
  extensionDocumentFromDrafts,
  extensionDraftsFromDocument,
  fieldExtensionDocumentToJson,
  newEmptyExtensionDocument,
  nextFieldExtensionCatalogId,
} from "../model/fieldExtensionEdit";
import {
  importFieldExtensionCatalog,
  readFieldExtensionCatalog,
} from "../model/fieldExtensionAppData";
import type {
  AppFieldExtensionsSettings,
  FieldExtensionDocument,
} from "../model/fieldExtensionTypes";
import type { FieldDefinitionDraft } from "../model/fieldDefinitionEdit";
import { cloneFieldDefinitionDrafts } from "../model/fieldDefinitionEdit";
import { errorMessage } from "../model/errors";
import { bumpSharedSettingsRevision } from "../model/sharedSettingsRevision";

export type WorkspaceFieldExtensionEditTarget = {
  pluginId: string;
  path: string;
  workspacePath: string;
  document: FieldExtensionDocument;
  fileLabel: string;
};

type DiscardPromptKind = "close" | "switch" | "newExtension" | "copyExtension";

type UseFieldExtensionEditorOverlayArgs = {
  settings: AppFieldExtensionsSettings;
  selectedDocuments: readonly FieldExtensionDocument[];
  workspacePinnedDocuments: readonly FieldExtensionDocument[];
  saveCatalog: (catalogId: string, contents: string) => Promise<string>;
  removeCatalog: (catalogId: string) => Promise<void>;
  refreshCatalogs: () => Promise<void>;
  workspaceTarget: WorkspaceFieldExtensionEditTarget | null;
  onWorkspaceWritten: () => Promise<void>;
  exportJson: (contents: string, suggestedName: string) => Promise<string | null>;
  onClosedByUser?: () => void;
};

export function useFieldExtensionEditorOverlay({
  settings,
  selectedDocuments,
  workspacePinnedDocuments,
  saveCatalog,
  removeCatalog,
  refreshCatalogs,
  workspaceTarget,
  onWorkspaceWritten,
  exportJson,
  onClosedByUser,
}: UseFieldExtensionEditorOverlayArgs) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"app" | "workspace">("app");
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [pluginId, setPluginId] = useState("");
  const [openingPluginId, setOpeningPluginId] = useState("");
  const [openingItemIds, setOpeningItemIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [displayName, setDisplayName] = useState("");
  const [drafts, setDrafts] = useState<FieldDefinitionDraft[]>([]);
  const [openingDrafts, setOpeningDrafts] = useState<FieldDefinitionDraft[]>([]);
  const [openingDisplayName, setOpeningDisplayName] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [discardPrompt, setDiscardPrompt] = useState<DiscardPromptKind | null>(
    null,
  );
  const [pendingCatalogId, setPendingCatalogId] = useState<string | null>(null);
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const workspaceSavePathRef = useRef<string | null>(null);

  const applyOpeningItemIds = useCallback((document: FieldExtensionDocument) => {
    setOpeningItemIds(new Set(document.fields.map((field) => field.id)));
  }, []);

  const clearOpeningItemIds = useCallback(() => {
    setOpeningItemIds(new Set());
  }, []);

  const loadDocument = useCallback(
    (
      document: FieldExtensionDocument,
      options?: { freshCreate?: boolean },
    ) => {
      setPluginId(document.id);
      setOpeningPluginId(document.id);
      setDisplayName(document.name);
      setOpeningDisplayName(document.name);
      const nextDrafts = extensionDraftsFromDocument(document);
      setDrafts(nextDrafts);
      setOpeningDrafts(cloneFieldDefinitionDrafts(nextDrafts));
      setSelectedIndex(nextDrafts.length > 0 ? 0 : -1);
      setDirty(false);
      setMessage(null);
      if (options?.freshCreate) {
        clearOpeningItemIds();
      } else {
        applyOpeningItemIds(document);
      }
    },
    [applyOpeningItemIds, clearOpeningItemIds],
  );

  const closeOverlay = useCallback(
    (options?: { notifyUser?: boolean }) => {
      setOpen(false);
      setEditingCatalogId(null);
      setDrafts([]);
      setOpeningDrafts([]);
      setDirty(false);
      setMessage(null);
      setDiscardPrompt(null);
      setPendingCatalogId(null);
      if (options?.notifyUser) {
        onClosedByUser?.();
      }
    },
    [onClosedByUser],
  );

  const openEditor = useCallback(
    async (catalogId?: string | null) => {
      if (workspaceTarget) {
        setMode("workspace");
        setEditingCatalogId(workspaceTarget.pluginId);
        workspaceSavePathRef.current = workspaceTarget.path;
        setWorkspacePath(workspaceTarget.workspacePath);
        loadDocument(workspaceTarget.document);
        setOpen(true);
        return;
      }
      setMode("app");
      setWorkspacePath(null);
      workspaceSavePathRef.current = null;
      const targetId =
        catalogId ??
        settings.selectedCatalogIds[0] ??
        settings.catalogs[0]?.id ??
        null;
      if (targetId == null) {
        setMessage("取り込んだ拡張がありません。");
        return;
      }
      const doc = await readFieldExtensionCatalog(targetId);
      if (doc == null) {
        setMessage("拡張を読み込めませんでした。");
        return;
      }
      setEditingCatalogId(targetId);
      loadDocument(doc);
      setOpen(true);
    },
    [loadDocument, settings.catalogs, settings.selectedCatalogIds, workspaceTarget],
  );

  const requestClose = useCallback(() => {
    if (dirty) {
      setDiscardPrompt("close");
      return;
    }
    closeOverlay({ notifyUser: true });
  }, [closeOverlay, dirty]);

  const forceClose = useCallback(() => {
    setDiscardPrompt(null);
    setPendingCatalogId(null);
    closeOverlay({ notifyUser: false });
  }, [closeOverlay]);

  const adoptCatalog = useCallback(
    async (catalogId: string) => {
      const doc = await readFieldExtensionCatalog(catalogId);
      if (doc == null) {
        setMessage("拡張を読み込めませんでした。");
        return;
      }
      setEditingCatalogId(catalogId);
      loadDocument(doc);
    },
    [loadDocument],
  );

  const runCreateNew = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const id = nextFieldExtensionCatalogId(settings.catalogs.map((c) => c.id));
      const document = newEmptyExtensionDocument(id);
      const contents = fieldExtensionDocumentToJson(document);
      await importFieldExtensionCatalog(contents, false);
      bumpSharedSettingsRevision();
      await refreshCatalogs();
      setEditingCatalogId(id);
      loadDocument(document, { freshCreate: true });
    } catch (err) {
      setMessage(errorMessage(err, "拡張を作れませんでした。"));
    } finally {
      setBusy(false);
    }
  }, [loadDocument, refreshCatalogs, settings.catalogs]);

  const buildDocument = useCallback(() => {
    if (editingCatalogId == null && mode !== "workspace") return null;
    return extensionDocumentFromDrafts(pluginId, displayName, drafts);
  }, [displayName, drafts, editingCatalogId, mode, pluginId]);

  const runCopyNew = useCallback(async () => {
    const built = buildDocument();
    if (built == null || !built.ok) {
      setMessage(built && !built.ok ? built.message : "コピーできません。");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const id = nextFieldExtensionCatalogId(settings.catalogs.map((c) => c.id));
      const copy: FieldExtensionDocument = {
        ...built.document,
        id,
        name: `${built.document.name} のコピー`,
      };
      const contents = fieldExtensionDocumentToJson(copy);
      await importFieldExtensionCatalog(contents, false);
      bumpSharedSettingsRevision();
      await refreshCatalogs();
      setEditingCatalogId(id);
      loadDocument(copy);
    } catch (err) {
      setMessage(errorMessage(err, "コピーできませんでした。"));
    } finally {
      setBusy(false);
    }
  }, [buildDocument, loadDocument, refreshCatalogs, settings.catalogs]);

  const confirmDiscard = useCallback(async () => {
    const prompt = discardPrompt;
    setDiscardPrompt(null);
    if (prompt === "close") {
      closeOverlay({ notifyUser: true });
      return;
    }
    if (prompt === "switch" && pendingCatalogId) {
      const nextId = pendingCatalogId;
      setPendingCatalogId(null);
      await adoptCatalog(nextId);
      return;
    }
    if (prompt === "newExtension") {
      await runCreateNew();
      return;
    }
    if (prompt === "copyExtension") {
      await runCopyNew();
    }
  }, [
    adoptCatalog,
    closeOverlay,
    discardPrompt,
    pendingCatalogId,
    runCopyNew,
    runCreateNew,
  ]);

  const save = useCallback(async () => {
    const built = buildDocument();
    if (built == null || !built.ok) {
      setMessage(built && !built.ok ? built.message : "保存できません。");
      return;
    }
    if (
      mode === "app" &&
      editingCatalogId != null &&
      built.document.id !== editingCatalogId &&
      settings.catalogs.some((catalog) => catalog.id === built.document.id)
    ) {
      setMessage("同じプラグイン ID の拡張が既にあります。");
      return;
    }
    if (
      mode === "workspace" &&
      workspacePinnedDocuments.some((entry) => entry.id === built.document.id)
    ) {
      setMessage("ピン留めの拡張と同じプラグイン ID には保存できません。");
      return;
    }
    const others =
      mode === "workspace"
        ? workspacePinnedDocuments
        : selectedDocuments.filter(
            (entry) =>
              entry.id !== built.document.id && entry.id !== editingCatalogId,
          );
    const collision = collisionAfterExtensionSave(built.document, others);
    if (collision != null) {
      setMessage(collision);
      return;
    }
    const contents = fieldExtensionDocumentToJson(built.document);
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "workspace" && workspaceSavePathRef.current && workspacePath) {
        if (!isTauri()) {
          setMessage("ブラウザ版では保存できません。");
          return;
        }
        const { writeFieldExtensionAtPath } = await import(
          "../model/fieldExtensionAppData"
        );
        await writeFieldExtensionAtPath(
          workspaceSavePathRef.current,
          contents,
          workspacePath,
        );
        await onWorkspaceWritten();
        loadDocument(built.document);
      } else if (editingCatalogId != null) {
        const nextCatalogId = await saveCatalog(editingCatalogId, contents);
        setEditingCatalogId(nextCatalogId);
        loadDocument(built.document);
      }
      bumpSharedSettingsRevision();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }, [
    buildDocument,
    editingCatalogId,
    loadDocument,
    mode,
    onWorkspaceWritten,
    saveCatalog,
    selectedDocuments,
    settings.catalogs,
    workspacePath,
    workspacePinnedDocuments,
  ]);

  const revertDrafts = useCallback(() => {
    setDrafts(cloneFieldDefinitionDrafts(openingDrafts));
    setDisplayName(openingDisplayName);
    setPluginId(openingPluginId);
    setDirty(false);
    setMessage(null);
  }, [openingDisplayName, openingDrafts, openingPluginId]);

  const exportDocument = useCallback(async () => {
    const built = buildDocument();
    if (built == null || !built.ok) {
      setMessage(built && !built.ok ? built.message : "書き出せません。");
      return;
    }
    const contents = fieldExtensionDocumentToJson(built.document);
    const suggested = `${built.document.id}.fields.json`;
    await exportJson(contents, suggested);
  }, [buildDocument, exportJson]);

  const createNew = useCallback(() => {
    if (dirty) {
      setDiscardPrompt("newExtension");
      return;
    }
    void runCreateNew();
  }, [dirty, runCreateNew]);

  const copyNew = useCallback(() => {
    if (editingCatalogId == null) return;
    if (dirty) {
      setDiscardPrompt("copyExtension");
      return;
    }
    void runCopyNew();
  }, [dirty, editingCatalogId, runCopyNew]);

  const removeCurrent = useCallback(async () => {
    if (editingCatalogId == null) return;
    await removeCatalog(editingCatalogId);
    bumpSharedSettingsRevision();
    const remaining = settings.catalogs.filter((c) => c.id !== editingCatalogId);
    if (remaining.length === 0) {
      closeOverlay({ notifyUser: true });
      return;
    }
    const nextId = remaining[0]!.id;
    const doc = await readFieldExtensionCatalog(nextId);
    if (doc == null) {
      closeOverlay({ notifyUser: true });
      return;
    }
    setEditingCatalogId(nextId);
    loadDocument(doc);
  }, [closeOverlay, editingCatalogId, loadDocument, removeCatalog, settings.catalogs]);

  const selectCatalog = useCallback(
    (catalogId: string) => {
      if (catalogId === editingCatalogId) return;
      if (dirty) {
        setPendingCatalogId(catalogId);
        setDiscardPrompt("switch");
        return;
      }
      void adoptCatalog(catalogId);
    },
    [adoptCatalog, dirty, editingCatalogId],
  );

  return {
    open,
    openEditor,
    requestClose,
    forceClose,
    confirmDiscard,
    discardPrompt,
    mode,
    settings,
    editingCatalogId,
    pluginId,
    setPluginId,
    openingItemIds,
    displayName,
    setDisplayName,
    drafts,
    setDrafts,
    openingDrafts,
    openingDisplayName,
    selectedIndex,
    setSelectedIndex,
    dirty,
    setDirty,
    busy,
    message,
    setMessage,
    save,
    revertDrafts,
    exportDocument,
    createNew,
    copyNew,
    removeCurrent,
    selectCatalog,
    cancelDiscard: () => {
      setDiscardPrompt(null);
      setPendingCatalogId(null);
    },
  };
}
