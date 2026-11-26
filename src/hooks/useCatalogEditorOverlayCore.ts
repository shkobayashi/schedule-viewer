import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { focusScheduleWindowViaTauri } from "../model/windowSession";

export type CatalogEditorOverlayMode = "app" | "workspace";

export type CatalogDiscardPrompt = "close" | "switch" | "newList" | null;

export type CatalogEditorWorkspaceTarget<Item> = {
  path: string;
  workspacePath: string;
  items: readonly Item[];
  fileLabel: string;
};

export type CatalogExternalChange =
  | { kind: "imported"; catalogId: string; fromSelf: boolean }
  | { kind: "removed"; catalogId: string };

export type CatalogEditorOverlayMessages = {
  fileClaimedElsewhere: string;
  catalogClaimedElsewhere: string;
  created: (catalogId: string) => string;
  createFailed: string;
  removed: (catalogId: string) => string;
  removeFailed: string;
  workspaceSaved: string;
  saveFailed: string;
  workspaceAppliedNote: string;
};

export type CatalogEditorOverlayCoreConfig<Item, Catalog extends { id: string }> = {
  catalogs: readonly Catalog[];
  appliedCatalogId: string | null;
  saveCatalog: (catalogId: string, contents: string, overwrite: boolean) => Promise<void>;
  removeCatalog: (catalogId: string) => Promise<void>;
  workspaceTarget: CatalogEditorWorkspaceTarget<Item> | null;
  onWorkspaceWritten: () => Promise<void>;
  onRemovedWhileEditing: () => void;
  emptyItems: readonly Item[];
  loadCatalogItems: (catalogId: string) => Promise<readonly Item[]>;
  claimEdit: (key: string) => Promise<{ claimed: boolean; holderLabel?: string }>;
  releaseEdit: (key: string | null | undefined) => Promise<void>;
  nextCatalogId: (existingIds: readonly string[]) => string;
  newListContents: () => string;
  writeWorkspace: (
    path: string,
    contents: string,
    workspacePath: string,
  ) => Promise<void>;
  reactToExternalChange: (
    editingCatalogId: string | null,
    change: CatalogExternalChange,
  ) => "close" | "reload" | "ignore";
  shouldReloadItems: (current: readonly Item[], loaded: readonly Item[]) => boolean;
  reloadWorkspaceOnlyWhenItemsDiffer: boolean;
  resetPromptsBeforeForceClose: boolean;
  messages: CatalogEditorOverlayMessages;
};

export type CatalogEditorOverlayCoreResult<Item, Catalog extends { id: string }> = {
  open: boolean;
  mode: CatalogEditorOverlayMode;
  openEditor: () => void;
  requestClose: () => void;
  forceClose: () => void;
  editingCatalogId: string | null;
  editingItems: readonly Item[];
  itemsRevision: number;
  appliedCatalogId: string | null;
  workspaceFileLabel: string | null;
  workspaceAppliedNote: string;
  catalogs: readonly Catalog[];
  busy: boolean;
  message: string | null;
  setMessage: (value: string | null) => void;
  dirty: boolean;
  setDirty: (value: boolean) => void;
  discardPrompt: CatalogDiscardPrompt;
  copyConfirmOpen: boolean;
  removeConfirmOpen: boolean;
  confirmDiscard: () => Promise<void>;
  cancelDiscard: () => void;
  confirmCopy: () => void;
  cancelCopy: () => void;
  requestRemoveCatalog: () => void;
  confirmRemoveCatalog: () => Promise<void>;
  cancelRemoveCatalog: () => void;
  selectCatalog: (catalogId: string) => void;
  save: (catalogId: string, contents: string) => Promise<void>;
  saveWorkspace: (contents: string) => Promise<void>;
  requestNewList: () => void;
  requestCopyList: (contents: string) => void;
  notifyExternalCatalogImport: (catalogId: string) => void;
  notifyExternalCatalogRemoved: (catalogId: string) => void;
};

const WORKSPACE_CATALOG_ID = "__workspace__";

export function useCatalogEditorOverlayCore<Item, Catalog extends { id: string }>(
  config: CatalogEditorOverlayCoreConfig<Item, Catalog>,
): CatalogEditorOverlayCoreResult<Item, Catalog> {
  const {
    catalogs,
    appliedCatalogId,
    saveCatalog,
    removeCatalog,
    workspaceTarget,
    onWorkspaceWritten,
    onRemovedWhileEditing,
    emptyItems,
    loadCatalogItems,
    claimEdit,
    releaseEdit,
    nextCatalogId,
    newListContents,
    writeWorkspace,
    reactToExternalChange,
    shouldReloadItems,
    reloadWorkspaceOnlyWhenItemsDiffer,
    resetPromptsBeforeForceClose,
    messages,
  } = config;

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CatalogEditorOverlayMode>("app");
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<readonly Item[]>(emptyItems);
  const [itemsRevision, setItemsRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [discardPrompt, setDiscardPrompt] = useState<CatalogDiscardPrompt>(null);
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [pendingCatalogId, setPendingCatalogId] = useState<string | null>(null);
  const [pendingCreateContents, setPendingCreateContents] = useState<string | null>(
    null,
  );
  const selfSaveRef = useRef(false);
  const selfRemovingRef = useRef(false);
  const editingClaimKeyRef = useRef<string | null>(null);
  const editingCatalogIdRef = useRef<string | null>(null);
  const editingItemsRef = useRef(editingItems);
  const openRef = useRef(open);
  const overlayGenerationRef = useRef(0);
  editingCatalogIdRef.current = editingCatalogId;
  editingItemsRef.current = editingItems;
  openRef.current = open;

  const bumpOverlayGeneration = () => {
    overlayGenerationRef.current += 1;
    return overlayGenerationRef.current;
  };

  const isOverlayStale = (generation: number) =>
    generation !== overlayGenerationRef.current || !openRef.current;

  const setClaimKey = (key: string | null) => {
    editingClaimKeyRef.current = key;
  };

  const loadItems = useCallback(
    async (catalogId: string) => {
      const loaded = await loadCatalogItems(catalogId);
      setEditingItems(loaded);
      setItemsRevision((value) => value + 1);
      setDirty(false);
    },
    [loadCatalogItems],
  );

  const loadWorkspaceItems = useCallback((items: readonly Item[]) => {
    setEditingItems(items);
    setItemsRevision((value) => value + 1);
    setDirty(false);
  }, []);

  const releaseClaim = useCallback(
    async (claimKey: string | null) => {
      if (!isTauri() || claimKey == null) return;
      await releaseEdit(claimKey);
    },
    [releaseEdit],
  );

  const closeOverlay = useCallback(async () => {
    bumpOverlayGeneration();
    const current = editingClaimKeyRef.current;
    await releaseClaim(current);
    setClaimKey(null);
    setOpen(false);
    setMode("app");
    setEditingCatalogId(null);
    setEditingItems(emptyItems);
    setDirty(false);
    setMessage(null);
    setDiscardPrompt(null);
    setCopyConfirmOpen(false);
    setRemoveConfirmOpen(false);
    setPendingCatalogId(null);
    setPendingCreateContents(null);
  }, [emptyItems, releaseClaim]);

  const requestClose = useCallback(() => {
    if (dirty) {
      setDiscardPrompt("close");
      return;
    }
    void closeOverlay();
  }, [closeOverlay, dirty]);

  const forceClose = useCallback(() => {
    if (resetPromptsBeforeForceClose) {
      setDiscardPrompt(null);
      setPendingCatalogId(null);
      setPendingCreateContents(null);
      setCopyConfirmOpen(false);
      setRemoveConfirmOpen(false);
    }
    void closeOverlay();
  }, [closeOverlay, resetPromptsBeforeForceClose]);

  const openEditor = useCallback(() => {
    void releaseClaim(editingClaimKeyRef.current);
    if (workspaceTarget) {
      const generation = bumpOverlayGeneration();
      setOpen(true);
      setMode("workspace");
      setEditingCatalogId(WORKSPACE_CATALOG_ID);
      setClaimKey(workspaceTarget.path);
      loadWorkspaceItems(workspaceTarget.items);
      setMessage(null);
      void (async () => {
        if (!isTauri()) return;
        setBusy(true);
        try {
          const claim = await claimEdit(workspaceTarget.path);
          if (isOverlayStale(generation)) {
            if (claim.claimed) {
              await releaseClaim(workspaceTarget.path);
            }
            return;
          }
          if (!claim.claimed) {
            if (claim.holderLabel) {
              await focusScheduleWindowViaTauri(claim.holderLabel);
            }
            setMessage(messages.fileClaimedElsewhere);
            setEditingCatalogId(null);
            setClaimKey(null);
          }
        } finally {
          if (!isOverlayStale(generation)) {
            setBusy(false);
          }
        }
      })();
      return;
    }
    bumpOverlayGeneration();
    setOpen(true);
    setMode("app");
    setEditingCatalogId(null);
    setClaimKey(null);
    setEditingItems(emptyItems);
    setItemsRevision((value) => value + 1);
    setDirty(false);
    setMessage(null);
  }, [
    claimEdit,
    emptyItems,
    loadWorkspaceItems,
    messages.fileClaimedElsewhere,
    releaseClaim,
    workspaceTarget,
  ]);

  const adoptCatalog = useCallback(
    async (catalogId: string): Promise<boolean> => {
      const generation = overlayGenerationRef.current;
      setBusy(true);
      setMessage(null);
      try {
        if (isTauri()) {
          const claim = await claimEdit(catalogId);
          if (isOverlayStale(generation)) {
            if (claim.claimed) {
              await releaseClaim(catalogId);
            }
            return false;
          }
          if (!claim.claimed) {
            if (claim.holderLabel) {
              await focusScheduleWindowViaTauri(claim.holderLabel);
            }
            setMessage(messages.catalogClaimedElsewhere);
            return false;
          }
        }
        await releaseClaim(editingClaimKeyRef.current);
        if (isOverlayStale(generation)) {
          await releaseClaim(catalogId);
          return false;
        }
        setEditingCatalogId(catalogId);
        setClaimKey(catalogId);
        await loadItems(catalogId);
        return !isOverlayStale(generation);
      } finally {
        if (!isOverlayStale(generation)) {
          setBusy(false);
        }
      }
    },
    [claimEdit, loadItems, messages.catalogClaimedElsewhere, releaseClaim],
  );

  const openImportedCatalog = useCallback(
    async (catalogId: string): Promise<boolean> => {
      const generation = overlayGenerationRef.current;
      if (isTauri()) {
        const claim = await claimEdit(catalogId);
        if (isOverlayStale(generation)) {
          if (claim.claimed) {
            await releaseClaim(catalogId);
          }
          return false;
        }
        if (!claim.claimed) {
          if (claim.holderLabel) {
            await focusScheduleWindowViaTauri(claim.holderLabel);
          }
          setMessage(messages.catalogClaimedElsewhere);
          return false;
        }
      }
      await releaseClaim(editingClaimKeyRef.current);
      if (isOverlayStale(generation)) {
        await releaseClaim(catalogId);
        return false;
      }
      setEditingCatalogId(catalogId);
      setClaimKey(catalogId);
      await loadItems(catalogId);
      return !isOverlayStale(generation);
    },
    [claimEdit, loadItems, messages.catalogClaimedElsewhere, releaseClaim],
  );

  const createCatalogInAppData = useCallback(
    async (contents: string) => {
      const catalogIds = catalogs.map((catalog) => catalog.id);
      const catalogId = nextCatalogId(catalogIds);
      setBusy(true);
      setMessage(null);
      try {
        selfSaveRef.current = true;
        await saveCatalog(catalogId, contents, false);
        selfSaveRef.current = false;
        await openImportedCatalog(catalogId);
        setMessage(messages.created(catalogId));
      } catch (error) {
        selfSaveRef.current = false;
        setMessage(error instanceof Error ? error.message : messages.createFailed);
      } finally {
        setBusy(false);
      }
    },
    [
      catalogs,
      messages.createFailed,
      messages.created,
      nextCatalogId,
      openImportedCatalog,
      saveCatalog,
    ],
  );

  const runNewList = useCallback(async () => {
    await createCatalogInAppData(newListContents());
  }, [createCatalogInAppData, newListContents]);

  const runCopyList = useCallback(
    async (contents: string) => {
      await createCatalogInAppData(contents);
    },
    [createCatalogInAppData],
  );

  const requestNewList = useCallback(() => {
    if (dirty) {
      setPendingCreateContents(newListContents());
      setDiscardPrompt("newList");
      return;
    }
    void runNewList();
  }, [dirty, newListContents, runNewList]);

  const requestCopyList = useCallback(
    (contents: string) => {
      if (editingCatalogId == null || mode === "workspace") return;
      if (dirty) {
        setCopyConfirmOpen(true);
        setPendingCreateContents(contents);
        return;
      }
      void runCopyList(contents);
    },
    [dirty, editingCatalogId, mode, runCopyList],
  );

  const confirmDiscard = useCallback(async () => {
    const prompt = discardPrompt;
    setDiscardPrompt(null);
    if (prompt === "close") {
      await closeOverlay();
      return;
    }
    if (prompt === "switch" && pendingCatalogId) {
      const nextId = pendingCatalogId;
      setPendingCatalogId(null);
      await adoptCatalog(nextId);
      return;
    }
    if (prompt === "newList") {
      await runNewList();
      setPendingCreateContents(null);
      return;
    }
  }, [
    adoptCatalog,
    closeOverlay,
    discardPrompt,
    pendingCatalogId,
    runNewList,
  ]);

  const confirmCopy = useCallback(() => {
    setCopyConfirmOpen(false);
    const contents = pendingCreateContents;
    setPendingCreateContents(null);
    if (!contents) return;
    void runCopyList(contents);
  }, [pendingCreateContents, runCopyList]);

  const cancelCopy = useCallback(() => {
    setCopyConfirmOpen(false);
    setPendingCreateContents(null);
  }, []);

  const requestRemoveCatalog = useCallback(() => {
    if (editingCatalogId == null || mode !== "app") return;
    setRemoveConfirmOpen(true);
  }, [editingCatalogId, mode]);

  const confirmRemoveCatalog = useCallback(async () => {
    const catalogId = editingCatalogIdRef.current;
    if (catalogId == null || catalogId === WORKSPACE_CATALOG_ID || mode !== "app") {
      return;
    }
    setRemoveConfirmOpen(false);
    const nextId = catalogs.find((catalog) => catalog.id !== catalogId)?.id ?? null;
    setBusy(true);
    setMessage(null);
    selfRemovingRef.current = true;
    try {
      await removeCatalog(catalogId);
      await releaseClaim(catalogId);
      setClaimKey(null);
      setDirty(false);
      setMessage(messages.removed(catalogId));
      if (nextId) {
        await adoptCatalog(nextId);
      } else {
        setEditingCatalogId(null);
        setEditingItems(emptyItems);
        setItemsRevision((value) => value + 1);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : messages.removeFailed,
      );
    } finally {
      selfRemovingRef.current = false;
      setBusy(false);
    }
  }, [
    adoptCatalog,
    catalogs,
    emptyItems,
    messages.removeFailed,
    messages.removed,
    mode,
    removeCatalog,
    releaseClaim,
  ]);

  const cancelRemoveCatalog = useCallback(() => {
    setRemoveConfirmOpen(false);
  }, []);

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

  const save = useCallback(
    async (catalogId: string, contents: string) => {
      selfSaveRef.current = true;
      try {
        await saveCatalog(catalogId, contents, true);
        await loadItems(catalogId);
      } finally {
        selfSaveRef.current = false;
      }
    },
    [loadItems, saveCatalog],
  );

  const saveWorkspace = useCallback(
    async (contents: string) => {
      if (!workspaceTarget) return;
      setBusy(true);
      setMessage(null);
      try {
        await writeWorkspace(
          workspaceTarget.path,
          contents,
          workspaceTarget.workspacePath,
        );
        await onWorkspaceWritten();
        setDirty(false);
        setMessage(messages.workspaceSaved);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : messages.saveFailed);
      } finally {
        setBusy(false);
      }
    },
    [
      loadWorkspaceItems,
      messages.saveFailed,
      messages.workspaceSaved,
      onWorkspaceWritten,
      workspaceTarget,
      writeWorkspace,
    ],
  );

  useEffect(() => {
    if (!open || mode !== "app" || editingCatalogId == null) return;
    if (editingCatalogId === WORKSPACE_CATALOG_ID) return;
    if (selfRemovingRef.current) return;
    if (!catalogs.some((catalog) => catalog.id === editingCatalogId)) {
      void (async () => {
        await releaseClaim(editingClaimKeyRef.current);
        setClaimKey(null);
        setEditingCatalogId(null);
        setEditingItems(emptyItems);
        setItemsRevision((value) => value + 1);
        setDirty(false);
        setOpen(false);
        onRemovedWhileEditing();
      })();
    }
  }, [
    catalogs,
    editingCatalogId,
    emptyItems,
    mode,
    onRemovedWhileEditing,
    open,
    releaseClaim,
  ]);

  const notifyExternalCatalogImport = useCallback(
    (catalogId: string) => {
      if (!open || mode !== "app") return;
      const reaction = reactToExternalChange(editingCatalogId, {
        kind: "imported",
        catalogId,
        fromSelf: selfSaveRef.current,
      });
      if (reaction === "reload" && editingCatalogId === catalogId) {
        void (async () => {
          const loaded = await loadCatalogItems(catalogId);
          if (!shouldReloadItems(editingItemsRef.current, loaded)) {
            return;
          }
          setEditingItems(loaded);
          setItemsRevision((value) => value + 1);
          setDirty(false);
        })();
      }
    },
    [
      editingCatalogId,
      loadCatalogItems,
      mode,
      open,
      reactToExternalChange,
      shouldReloadItems,
    ],
  );

  const notifyExternalCatalogRemoved = useCallback(
    (catalogId: string) => {
      if (!open || mode !== "app") return;
      const reaction = reactToExternalChange(editingCatalogId, {
        kind: "removed",
        catalogId,
      });
      if (reaction === "close") {
        void (async () => {
          await releaseClaim(editingClaimKeyRef.current);
          setClaimKey(null);
          setEditingCatalogId(null);
          setEditingItems(emptyItems);
          setOpen(false);
          onRemovedWhileEditing();
        })();
      }
    },
    [
      editingCatalogId,
      emptyItems,
      mode,
      onRemovedWhileEditing,
      open,
      reactToExternalChange,
      releaseClaim,
    ],
  );

  useEffect(() => {
    if (!open) return;
    return () => {
      void releaseEdit(editingClaimKeyRef.current);
    };
  }, [open, releaseEdit]);

  useEffect(() => {
    if (!open || mode !== "workspace" || !workspaceTarget) return;
    if (reloadWorkspaceOnlyWhenItemsDiffer) {
      if (!shouldReloadItems(editingItemsRef.current, workspaceTarget.items)) {
        return;
      }
    }
    loadWorkspaceItems(workspaceTarget.items);
  }, [
    loadWorkspaceItems,
    mode,
    open,
    reloadWorkspaceOnlyWhenItemsDiffer,
    shouldReloadItems,
    workspaceTarget,
  ]);

  return {
    open,
    mode,
    openEditor,
    requestClose,
    forceClose,
    editingCatalogId,
    editingItems,
    itemsRevision,
    appliedCatalogId,
    workspaceFileLabel: workspaceTarget?.fileLabel ?? null,
    workspaceAppliedNote: messages.workspaceAppliedNote,
    catalogs,
    busy,
    message,
    setMessage,
    dirty,
    setDirty,
    discardPrompt,
    copyConfirmOpen,
    removeConfirmOpen,
    confirmDiscard,
    cancelDiscard: () => {
      setDiscardPrompt(null);
      setPendingCatalogId(null);
      setPendingCreateContents(null);
    },
    confirmCopy,
    cancelCopy,
    requestRemoveCatalog,
    confirmRemoveCatalog,
    cancelRemoveCatalog,
    selectCatalog,
    save,
    saveWorkspace,
    requestNewList,
    requestCopyList,
    notifyExternalCatalogImport,
    notifyExternalCatalogRemoved,
  };
}
