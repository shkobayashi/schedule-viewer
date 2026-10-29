import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import type { AppColorsSettings } from "../model/colorAppData";
import {
  claimColorCatalogEdit,
  readColorCatalog,
  releaseColorCatalogEdit,
  writeColorsAtPath,
} from "../model/colorAppData";
import { starterColorCatalogDocument, type ColorItem } from "../model/colorCatalog";
import {
  overlayReactionToColorCatalogChange,
  shouldReloadEditingColorCatalogItems,
} from "../model/colorCatalogEditSession";
import { colorsToJson, nextColorCatalogId } from "../model/colorEdit";
import { focusScheduleWindowViaTauri } from "../model/windowSession";

export type WorkspaceColorEditTarget = {
  colorsPath: string;
  workspacePath: string;
  items: readonly ColorItem[];
  fileLabel: string;
};

type UseColorCatalogEditorOverlayArgs = {
  settings: AppColorsSettings;
  appliedCatalogId: string | null;
  saveCatalog: (catalogId: string, contents: string, overwrite: boolean) => Promise<void>;
  removeCatalog: (catalogId: string) => Promise<void>;
  workspaceTarget: WorkspaceColorEditTarget | null;
  onWorkspaceColorsWritten: () => Promise<void>;
  onRemovedWhileEditing: () => void;
};

export type ColorEditorOverlayMode = "app" | "workspace";

export type DiscardPrompt = "close" | "switch" | "newList" | null;

export function useColorCatalogEditorOverlay({
  settings,
  appliedCatalogId,
  saveCatalog,
  removeCatalog,
  workspaceTarget,
  onWorkspaceColorsWritten,
  onRemovedWhileEditing,
}: UseColorCatalogEditorOverlayArgs) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ColorEditorOverlayMode>("app");
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<readonly ColorItem[]>(
    [],
  );
  const [itemsRevision, setItemsRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [discardPrompt, setDiscardPrompt] = useState<DiscardPrompt>(null);
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

  const loadItems = useCallback(async (catalogId: string) => {
    const doc = await readColorCatalog(catalogId);
    setEditingItems(doc?.colors ?? []);
    setItemsRevision((value) => value + 1);
    setDirty(false);
  }, []);

  const loadWorkspaceItems = useCallback((items: readonly ColorItem[]) => {
    setEditingItems(items);
    setItemsRevision((value) => value + 1);
    setDirty(false);
  }, []);

  const releaseClaim = useCallback(async (claimKey: string | null) => {
    if (!isTauri() || claimKey == null) return;
    await releaseColorCatalogEdit(claimKey);
  }, []);

  const closeOverlay = useCallback(async () => {
    bumpOverlayGeneration();
    const current = editingClaimKeyRef.current;
    await releaseClaim(current);
    setClaimKey(null);
    setOpen(false);
    setMode("app");
    setEditingCatalogId(null);
    setEditingItems([]);
    setDirty(false);
    setMessage(null);
    setDiscardPrompt(null);
    setCopyConfirmOpen(false);
    setRemoveConfirmOpen(false);
    setPendingCatalogId(null);
    setPendingCreateContents(null);
  }, [releaseClaim]);

  const requestClose = useCallback(() => {
    if (dirty) {
      setDiscardPrompt("close");
      return;
    }
    void closeOverlay();
  }, [closeOverlay, dirty]);

  const forceClose = useCallback(() => {
    setDiscardPrompt(null);
    setPendingCatalogId(null);
    setPendingCreateContents(null);
    setCopyConfirmOpen(false);
    setRemoveConfirmOpen(false);
    void closeOverlay();
  }, [closeOverlay]);

  const openEditor = useCallback(() => {
    void releaseClaim(editingClaimKeyRef.current);
    if (workspaceTarget) {
      const generation = bumpOverlayGeneration();
      setOpen(true);
      setMode("workspace");
      setEditingCatalogId("__workspace__");
      setClaimKey(workspaceTarget.colorsPath);
      loadWorkspaceItems(workspaceTarget.items);
      setMessage(null);
      void (async () => {
        if (!isTauri()) return;
        setBusy(true);
        try {
          const claim = await claimColorCatalogEdit(workspaceTarget.colorsPath);
          if (isOverlayStale(generation)) {
            if (claim.claimed) {
              await releaseClaim(workspaceTarget.colorsPath);
            }
            return;
          }
          if (!claim.claimed) {
            if (claim.holderLabel) {
              await focusScheduleWindowViaTauri(claim.holderLabel);
            }
            setMessage("別のウィンドウで同じファイルを編集しています。");
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
    setEditingItems([]);
    setItemsRevision((value) => value + 1);
    setDirty(false);
    setMessage(null);
  }, [loadWorkspaceItems, releaseClaim, workspaceTarget]);

  const adoptCatalog = useCallback(
    async (catalogId: string): Promise<boolean> => {
      const generation = overlayGenerationRef.current;
      setBusy(true);
      setMessage(null);
      try {
        if (isTauri()) {
          const claim = await claimColorCatalogEdit(catalogId);
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
            setMessage("別のウィンドウで同じ一覧を編集しています。");
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
    [loadItems, releaseClaim],
  );

  const openImportedCatalog = useCallback(
    async (catalogId: string): Promise<boolean> => {
      const generation = overlayGenerationRef.current;
      if (isTauri()) {
        const claim = await claimColorCatalogEdit(catalogId);
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
          setMessage("別のウィンドウで同じ一覧を編集しています。");
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
    [loadItems, releaseClaim],
  );

  const createCatalogInAppData = useCallback(
    async (contents: string) => {
      const catalogIds = settings.catalogs.map((catalog) => catalog.id);
      const catalogId = nextColorCatalogId(catalogIds);
      setBusy(true);
      setMessage(null);
      try {
        selfSaveRef.current = true;
        await saveCatalog(catalogId, contents, false);
        selfSaveRef.current = false;
        await openImportedCatalog(catalogId);
        setMessage(`「${catalogId}」を作りました。`);
      } catch (error) {
        selfSaveRef.current = false;
        setMessage(error instanceof Error ? error.message : "作成に失敗しました。");
      } finally {
        setBusy(false);
      }
    },
    [openImportedCatalog, saveCatalog, settings.catalogs],
  );

  const runNewList = useCallback(async () => {
    const contents = colorsToJson(starterColorCatalogDocument().colors);
    await createCatalogInAppData(contents);
  }, [createCatalogInAppData]);

  const runCopyList = useCallback(
    async (contents: string) => {
      await createCatalogInAppData(contents);
    },
    [createCatalogInAppData],
  );

  const requestNewList = useCallback(() => {
    if (dirty) {
      setPendingCreateContents(colorsToJson(starterColorCatalogDocument().colors));
      setDiscardPrompt("newList");
      return;
    }
    void runNewList();
  }, [dirty, runNewList]);

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
    if (catalogId == null || catalogId === "__workspace__" || mode !== "app") return;
    setRemoveConfirmOpen(false);
    const nextId =
      settings.catalogs.find((catalog) => catalog.id !== catalogId)?.id ?? null;
    setBusy(true);
    setMessage(null);
    selfRemovingRef.current = true;
    try {
      await removeCatalog(catalogId);
      await releaseClaim(catalogId);
      setClaimKey(null);
      setDirty(false);
      setMessage(`「${catalogId}」を外しました。`);
      if (nextId) {
        await adoptCatalog(nextId);
      } else {
        setEditingCatalogId(null);
        setEditingItems([]);
        setItemsRevision((value) => value + 1);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "一覧を外せませんでした。",
      );
    } finally {
      selfRemovingRef.current = false;
      setBusy(false);
    }
  }, [adoptCatalog, mode, removeCatalog, releaseClaim, settings.catalogs]);

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
        await writeColorsAtPath(
          workspaceTarget.colorsPath,
          contents,
          workspaceTarget.workspacePath,
        );
        await onWorkspaceColorsWritten();
        setDirty(false);
        setMessage("色の一覧を保存しました。");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "保存に失敗しました。");
      } finally {
        setBusy(false);
      }
    },
    [loadWorkspaceItems, onWorkspaceColorsWritten, workspaceTarget],
  );

  useEffect(() => {
    if (!open || mode !== "app" || editingCatalogId == null) return;
    if (editingCatalogId === "__workspace__") return;
    if (selfRemovingRef.current) return;
    if (!settings.catalogs.some((catalog) => catalog.id === editingCatalogId)) {
      void (async () => {
        await releaseClaim(editingClaimKeyRef.current);
        setClaimKey(null);
        setEditingCatalogId(null);
        setEditingItems([]);
        setItemsRevision((value) => value + 1);
        setDirty(false);
        setOpen(false);
        onRemovedWhileEditing();
      })();
    }
  }, [
    editingCatalogId,
    mode,
    onRemovedWhileEditing,
    open,
    releaseClaim,
    settings.catalogs,
  ]);

  const notifyExternalCatalogImport = useCallback(
    (catalogId: string) => {
      if (!open || mode !== "app") return;
      const reaction = overlayReactionToColorCatalogChange(editingCatalogId, {
        kind: "imported",
        catalogId,
        fromSelf: selfSaveRef.current,
      });
      if (reaction === "reload" && editingCatalogId === catalogId) {
        void (async () => {
          const doc = await readColorCatalog(catalogId);
          const loaded = doc?.colors ?? [];
          if (
            !shouldReloadEditingColorCatalogItems(editingItemsRef.current, loaded)
          ) {
            return;
          }
          setEditingItems(loaded);
          setItemsRevision((value) => value + 1);
          setDirty(false);
        })();
      }
    },
    [editingCatalogId, mode, open],
  );

  const notifyExternalCatalogRemoved = useCallback(
    (catalogId: string) => {
      if (!open || mode !== "app") return;
      const reaction = overlayReactionToColorCatalogChange(editingCatalogId, {
        kind: "removed",
        catalogId,
      });
      if (reaction === "close") {
        void (async () => {
          await releaseClaim(editingClaimKeyRef.current);
          setClaimKey(null);
          setEditingCatalogId(null);
          setEditingItems([]);
          setOpen(false);
          onRemovedWhileEditing();
        })();
      }
    },
    [editingCatalogId, mode, onRemovedWhileEditing, open, releaseClaim],
  );

  useEffect(() => {
    if (!open) return;
    return () => {
      void releaseColorCatalogEdit(editingClaimKeyRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "workspace" || !workspaceTarget) return;
    if (
      !shouldReloadEditingColorCatalogItems(
        editingItemsRef.current,
        workspaceTarget.items,
      )
    ) {
      return;
    }
    loadWorkspaceItems(workspaceTarget.items);
  }, [loadWorkspaceItems, mode, open, workspaceTarget]);

  const workspaceAppliedNote =
    "このウィンドウのチャートは、設定ファイルの色の一覧を使っています。";

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
    workspaceAppliedNote,
    catalogs: settings.catalogs,
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
