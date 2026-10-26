import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { DocumentSnapshot } from "../model/history";
import type {
  Category,
  Milestone,
  MilestoneGroup,
  OutlineRoot,
  ScheduleDocument,
  ScheduleLevelDef,
} from "../model/types";
import { errorMessage } from "../model/errors";
import {
  acceptOpenedScheduleViaTauri,
  clearLastSchedulePathViaTauri,
  isTauri,
  openScheduleViaBrowserInput,
  openScheduleViaTauri,
  parseScheduleText,
  scheduleJsonFilename,
  scheduleParentDirectory,
  serializeScheduleDocument,
  SCHEDULE_FILE_NOT_FOUND,
} from "../model/scheduleFile";
import { useScheduleExternalReload } from "./scheduleFile/useScheduleExternalReload";
import { useScheduleRecoveryDraft } from "./scheduleFile/useScheduleRecoveryDraft";
import {
  SCHEDULE_SAVE_ERROR_DIALOG_TITLE,
  useScheduleSave,
} from "./scheduleFile/useScheduleSave";
import { useScheduleFilterPersistence } from "./scheduleFile/useScheduleFilterPersistence";
import { useScheduleStartupRecovery } from "./scheduleFile/useScheduleStartupRecovery";
import type { ScheduleFilterViewState } from "../model/scheduleFilterPersistence";
import { releaseScheduleFilterViaTauri } from "../model/scheduleFilterFile";
import { useSchedulePeerNotice } from "./useSchedulePeerNotice";
import { finalizeWindowClose } from "./useWindowSession";
import { listen } from "@tauri-apps/api/event";
import {
  acceptApplicationQuitViaTauri,
  cancelApplicationQuitViaTauri,
  cancelApplicationUpdateViaTauri,
  completeApplicationUpdateRecoveryViaTauri,
  createScheduleWindowViaTauri,
  readDroppedScheduleFileViaTauri,
  recoveryCloseActionViaTauri,
  releaseScheduleRecoveryViaTauri,
  reportExternalScheduleDropReadyViaTauri,
} from "../model/windowSession";
import { useScheduleDropOpen } from "./scheduleFile/useScheduleDropOpen";
import {
  recordRecentScheduleViaTauri,
  recordRecentWorkspaceViaTauri,
} from "../model/recentFilesAppData";
import { classifyOpenedJson } from "../model/workspaceJson";
import {
  acceptOpenedWorkspaceViaTauri,
  openWorkspaceFromFile,
  reloadWorkspaceFromDisk,
  WORKSPACE_DESKTOP_ONLY_DIALOG_TITLE,
  WORKSPACE_DESKTOP_ONLY_MESSAGE,
  type WorkspaceOpened,
} from "../model/workspaceLoad";
import type { WorkspaceWindowBinding } from "../model/workspaceTypes";
import type { RecentFilesStore } from "../model/recentFiles";

export type FileStatusTag = "sample" | "saved" | "unsaved";

type UseScheduleFileOptions = {
  title: string;
  categories: Category[];
  milestoneGroups: MilestoneGroup[];
  milestones: Milestone[];
  levels?: ScheduleLevelDef[];
  outline?: OutlineRoot;
  replaceDocument: (document: ScheduleDocument) => void;
  applyMergedDocument: (
    document: ScheduleDocument,
  ) => { before: DocumentSnapshot; after: DocumentSnapshot } | null;
  reloadDocumentFromDisk: (document: ScheduleDocument) => void;
  onAfterOpen: () => void;
  initialBaselineJson: string;
  hasOpenEditDialog: boolean;
  blockDocumentEditsRef: { current: boolean };
  setFilterViewState: (state: ScheduleFilterViewState) => void;
  getFilterViewState: () => ScheduleFilterViewState;
  knownMemberIds: ReadonlySet<string>;
  memberCatalogSettled: boolean;
  sidebarReorderDragging: boolean;
  getCanonicalJson?: () => string;
  getDocumentTitle?: () => string;
  onRecentFilesStoreUpdated?: (store: RecentFilesStore) => void;
  onWorkspaceBindingChange?: (binding: WorkspaceWindowBinding | null) => void;
};

export type ApplyOpenedFileOptions = {
  restoreFilters?: boolean;
  recordRecent?: boolean;
};

export function useScheduleFile({
  title,
  categories,
  milestoneGroups,
  milestones,
  levels,
  outline,
  replaceDocument,
  applyMergedDocument,
  reloadDocumentFromDisk,
  onAfterOpen,
  initialBaselineJson,
  hasOpenEditDialog,
  blockDocumentEditsRef,
  setFilterViewState,
  getFilterViewState,
  knownMemberIds,
  memberCatalogSettled,
  sidebarReorderDragging,
  getCanonicalJson,
  getDocumentTitle,
  onRecentFilesStoreUpdated,
  onWorkspaceBindingChange,
}: UseScheduleFileOptions) {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [browserFileLabel, setBrowserFileLabel] = useState<string | null>(null);
  const [baselineJson, setBaselineJson] = useState(initialBaselineJson);
  const [errorMessageText, setErrorMessageText] = useState<string | null>(null);
  const [errorDialogTitle, setErrorDialogTitle] = useState<string | undefined>(
    undefined,
  );
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);
  const discardPromptOpenRef = useRef(discardPromptOpen);
  discardPromptOpenRef.current = discardPromptOpen;
  const [pendingOpen, setPendingOpen] = useState(false);
  const pendingDropPathRef = useRef<string | null>(null);
  const pendingRecentPathRef = useRef<string | null>(null);
  const pendingWorkspaceReloadRef = useRef<WorkspaceOpened | null>(null);
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const [closePromptForUpdate, setClosePromptForUpdate] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [startupSettled, setStartupSettled] = useState(!isTauri());
  const startupSettledRef = useRef(startupSettled);
  startupSettledRef.current = startupSettled;
  const initialDirectoryRef = useRef<string | null>(null);
  const allowCloseRef = useRef(false);
  const requestMissingFileOpenRef = useRef<() => void>(() => {});
  const clearExternalReloadPromptRef = useRef<() => void>(() => {});
  const clearInvalidDiskHashRef = useRef<() => void>(() => {});

  const currentJson = useMemo(
    () =>
      serializeScheduleDocument(
        title,
        categories,
        milestoneGroups,
        milestones,
        levels,
        outline,
      ),
    [categories, levels, milestoneGroups, milestones, outline, title],
  );

  const isDirty = currentJson !== baselineJson;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const currentJsonRef = useRef(currentJson);
  currentJsonRef.current = currentJson;
  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;
  const baselineJsonRef = useRef(baselineJson);
  baselineJsonRef.current = baselineJson;
  const hasOpenEditDialogRef = useRef(hasOpenEditDialog);
  hasOpenEditDialogRef.current = hasOpenEditDialog;
  const fileBusyRef = useRef(fileBusy);
  fileBusyRef.current = fileBusy;
  const persistSuppressedRef = useRef(false);
  const getFilterViewStateRef = useRef(getFilterViewState);
  getFilterViewStateRef.current = getFilterViewState;

  const pruneContext = useMemo(
    () => ({
      categories,
      milestones,
      milestoneGroups,
      knownMemberIds,
    }),
    [categories, knownMemberIds, milestoneGroups, milestones],
  );

  const filterPersistence = useScheduleFilterPersistence({
    filePath,
    startupSettled,
    memberCatalogSettled,
    pruneContext,
    getFilterViewState: () => getFilterViewStateRef.current(),
    setFilterViewState,
    setErrorMessageText,
    filePathRef,
    persistSuppressedRef,
  });
  const restoreFiltersForPathRef = useRef(filterPersistence.restoreFiltersForPath);
  restoreFiltersForPathRef.current = filterPersistence.restoreFiltersForPath;
  const flushFilterOnCloseRef = useRef(filterPersistence.flushFilterOnClose);
  flushFilterOnCloseRef.current = filterPersistence.flushFilterOnClose;
  const syncLiveFilterRef = useRef(filterPersistence.syncLiveFilter);
  syncLiveFilterRef.current = filterPersistence.syncLiveFilter;

  const reportSaveError = useCallback((message: string) => {
    setErrorDialogTitle(SCHEDULE_SAVE_ERROR_DIALOG_TITLE);
    setErrorMessageText(message);
  }, []);

  const { clearRecoveryDraft, writeRecoveryDraftNow, syncLiveRecovery } =
    useScheduleRecoveryDraft({
    filePath,
    isDirty,
    currentJson,
    setErrorMessageText,
    filePathRef,
    isDirtyRef,
    currentJsonRef,
    baselineJsonRef,
  });

  const {
    pausePollRef,
    save,
    externalChangeOpen,
    confirmExternalOverwrite,
    confirmExternalSaveAs,
    cancelExternalChange,
  } = useScheduleSave({
    currentJson,
    getCanonicalJson,
    getDocumentTitle,
    title,
    filePath,
    setFilePath,
    setBrowserFileLabel,
    setBaselineJson,
    baselineJsonRef,
    fileBusyRef,
    setFileBusy,
    reportSaveError,
    clearRecoveryDraft,
    clearExternalReloadPromptRef,
    clearInvalidDiskHashRef,
  });
  const externalChangeOpenRef = useRef(externalChangeOpen);
  externalChangeOpenRef.current = externalChangeOpen;

  const notifyPeersRef = useRef<(status: "applied" | "pending" | "cleared") => void>(
    () => {},
  );
  const closePromptForQuitRef = useRef(false);
  const closePromptForUpdateRef = useRef(false);
  const updatePrepareResolverRef = useRef<((ready: boolean) => void) | null>(
    null,
  );
  const applicationUpdatingRef = useRef(false);
  const quitDiscardedRef = useRef(false);
  const applicationQuitRef = useRef(false);
  const syncLiveRecoveryRef = useRef(syncLiveRecovery);
  syncLiveRecoveryRef.current = syncLiveRecovery;

  const {
    reloadNotice,
    mergeNotice,
    diskUpdatedAgain,
    showDeferredReload,
    externalReloadOpen,
    clearExternalReloadPrompt,
    clearInvalidDiskHash,
    resetPollTracking,
    markMissingFilePrompted,
    setDeferredExternalContents,
    confirmExternalReload,
    keepLocalEditsOnExternalReload,
    requestDeferredConfirm,
    confirmBaselineMerge,
    buildExternalReloadAssessment,
    buildExternalReloadReview,
    onHistoryUndoApplied,
    onHistoryRedoApplied,
  } = useScheduleExternalReload({
    filePath,
    reloadDocumentFromDisk,
    applyMergedDocument,
    setBaselineJson,
    setErrorMessageText,
    baselineJson,
    currentJson,
    baselineJsonRef,
    isDirtyRef,
    hasOpenEditDialogRef,
    fileBusyRef,
    pausePollRef,
    clearRecoveryDraft,
    requestMissingFileOpenRef,
    notifyPeersRef,
  });

  const externalReloadAssessment = externalReloadOpen
    ? buildExternalReloadAssessment()
    : null;
  const externalReloadReview = externalReloadOpen
    ? buildExternalReloadReview()
    : null;
  clearExternalReloadPromptRef.current = clearExternalReloadPrompt;
  clearInvalidDiskHashRef.current = clearInvalidDiskHash;

  const statusTag: FileStatusTag = useMemo(() => {
    if (isDirty) return "unsaved";
    if (filePath || browserFileLabel) return "saved";
    return "sample";
  }, [browserFileLabel, filePath, isDirty]);

  const statusLabel = useMemo(() => {
    if (reloadNotice) return "ファイルを反映しました";
    if (statusTag === "unsaved") return "未保存";
    if (statusTag === "saved") {
      return scheduleJsonFilename(filePath) ?? browserFileLabel ?? "保存済み";
    }
    return "サンプルデータ";
  }, [browserFileLabel, filePath, reloadNotice, statusTag]);

  const displayFileName = useMemo(
    () => scheduleJsonFilename(filePath) ?? browserFileLabel ?? "サンプルデータ",
    [browserFileLabel, filePath],
  );

  const saveStatusLabel = useMemo(() => {
    if (isDirty) return "未保存";
    if (filePath || browserFileLabel) return "保存済み";
    return "サンプルデータ";
  }, [browserFileLabel, filePath, isDirty]);

  const applyOpenedFile = useCallback(
    async (
      pick: {
        path: string | null;
        displayName?: string | null;
        contents: string;
      },
      options?: ApplyOpenedFileOptions,
    ) => {
      const parsed = parseScheduleText(pick.contents);
      if (!parsed.ok) {
        setErrorMessageText(parsed.message);
        return false;
      }
      const previousPath = filePathRef.current;
      replaceDocument(parsed.document);
      filePathRef.current = pick.path;
      setFilePath(pick.path);
      setBrowserFileLabel(pick.path ? null : (pick.displayName ?? null));
      setBaselineJson(parsed.canonicalJson);
      clearExternalReloadPrompt();
      resetPollTracking();
      baselineJsonRef.current = parsed.canonicalJson;
      onAfterOpen();
      if (isTauri() && previousPath && previousPath !== pick.path) {
        void releaseScheduleRecoveryViaTauri(previousPath).catch((error) => {
          setErrorMessageText(
            errorMessage(error, "復旧用の控えを削除できませんでした。"),
          );
        });
        void releaseScheduleFilterViaTauri(previousPath).catch((error) => {
          setErrorMessageText(
            errorMessage(error, "絞り込みの記録を削除できませんでした。"),
          );
        });
      }
      if (options?.restoreFilters && pick.path) {
        await restoreFiltersForPathRef.current(pick.path, parsed.document);
      }
      if (options?.recordRecent && pick.path && isTauri()) {
        void recordRecentScheduleViaTauri(pick.path)
          .then((store) => onRecentFilesStoreUpdated?.(store))
          .catch(() => {});
      }
      return true;
    },
    [
      baselineJsonRef,
      clearExternalReloadPrompt,
      onAfterOpen,
      onRecentFilesStoreUpdated,
      replaceDocument,
      resetPollTracking,
    ],
  );

  const runOpenFromPath = useCallback(
    async (path: string) => {
      if (fileBusy || !startupSettledRef.current) return;
      setFileBusy(true);
      try {
        const contents = await readDroppedScheduleFileViaTauri(path);
        let data: unknown;
        try {
          data = JSON.parse(contents.replace(/^\uFEFF/, ""));
        } catch {
          setErrorMessageText("JSON の形式が正しくありません。");
          return;
        }
        const kind = classifyOpenedJson(data);
        if (kind === "workspace") {
          const opened = await openWorkspaceFromFile(path, contents);
          if (!opened.ok) {
            setErrorMessageText(opened.message);
            return;
          }
          await acceptOpenedWorkspaceViaTauri(
            path,
            opened.schedulePath,
            opened.scheduleContents,
          );
          onWorkspaceBindingChange?.(opened.binding);
          await applyOpenedFile(
            { path: opened.schedulePath, contents: opened.scheduleContents },
            { recordRecent: false },
          );
          void recordRecentWorkspaceViaTauri(path)
            .then((store) => onRecentFilesStoreUpdated?.(store))
            .catch(() => {});
          return;
        }
        if (kind === "unsupported") {
          setErrorMessageText("スケジュールの JSON を1つだけ開いてください。");
          return;
        }
        onWorkspaceBindingChange?.(null);
        const parsed = parseScheduleText(contents);
        if (!parsed.ok) {
          setErrorMessageText(parsed.message);
          return;
        }
        await acceptOpenedScheduleViaTauri(path, contents);
        await applyOpenedFile(
          { path, contents },
          { recordRecent: true },
        );
      } catch (error) {
        const message = errorMessage(error, "ファイルを開けませんでした。");
        setErrorMessageText(
          message === SCHEDULE_FILE_NOT_FOUND
            ? "ファイルを開けませんでした。"
            : message,
        );
      } finally {
        setFileBusy(false);
      }
    },
    [
      applyOpenedFile,
      fileBusy,
      onRecentFilesStoreUpdated,
      onWorkspaceBindingChange,
    ],
  );

  const beginOpenFromPath = useCallback(
    (path: string) => {
      if (fileBusyRef.current || !startupSettledRef.current) return;
      if (isDirtyRef.current) {
        pendingRecentPathRef.current = null;
        pendingDropPathRef.current = path;
        setPendingOpen(false);
        setDiscardPromptOpen(true);
        return;
      }
      void runOpenFromPath(path);
    },
    [runOpenFromPath],
  );

  const beginOpenFromDroppedPath = beginOpenFromPath;

  const beginOpenFromRecentPath = useCallback(
    (path: string) => {
      if (fileBusyRef.current || !startupSettledRef.current) return;
      if (isDirtyRef.current) {
        pendingDropPathRef.current = null;
        pendingRecentPathRef.current = path;
        setPendingOpen(false);
        setDiscardPromptOpen(true);
        return;
      }
      void runOpenFromPath(path);
    },
    [runOpenFromPath],
  );

  const runOpen = useCallback(async () => {
    if (fileBusy || !startupSettledRef.current) return;
    const initialDirectory = initialDirectoryRef.current;
    initialDirectoryRef.current = null;
    setFileBusy(true);
    try {
      const pick = isTauri()
        ? await openScheduleViaTauri(initialDirectory)
        : await openScheduleViaBrowserInput();
      if (!pick) return;
      let data: unknown;
      try {
        data = JSON.parse(pick.contents.replace(/^\uFEFF/, ""));
      } catch {
        setErrorMessageText("JSON の形式が正しくありません。");
        return;
      }
      const kind = classifyOpenedJson(data);
      if (kind === "workspace") {
        if (!isTauri() || !pick.path) {
          setErrorDialogTitle(WORKSPACE_DESKTOP_ONLY_DIALOG_TITLE);
          setErrorMessageText(WORKSPACE_DESKTOP_ONLY_MESSAGE);
          return;
        }
        const opened = await openWorkspaceFromFile(pick.path, pick.contents);
        if (!opened.ok) {
          setErrorMessageText(opened.message);
          return;
        }
        await acceptOpenedWorkspaceViaTauri(
          pick.path,
          opened.schedulePath,
          opened.scheduleContents,
        );
        onWorkspaceBindingChange?.(opened.binding);
        await applyOpenedFile(
          { path: opened.schedulePath, contents: opened.scheduleContents },
          { recordRecent: false },
        );
        void recordRecentWorkspaceViaTauri(pick.path)
          .then((store) => onRecentFilesStoreUpdated?.(store))
          .catch(() => {});
        return;
      }
      if (kind === "unsupported") {
        setErrorMessageText("スケジュールの JSON を1つだけ開いてください。");
        return;
      }
      onWorkspaceBindingChange?.(null);
      const parsed = parseScheduleText(pick.contents);
      if (!parsed.ok) {
        setErrorMessageText(parsed.message);
        return;
      }
      if (isTauri() && pick.path) {
        await acceptOpenedScheduleViaTauri(pick.path, pick.contents);
      }
      await applyOpenedFile(pick, {
        recordRecent: Boolean(isTauri() && pick.path),
      });
    } catch (error) {
      setErrorMessageText(errorMessage(error, "ファイルを開けませんでした。"));
    } finally {
      setFileBusy(false);
    }
  }, [
    applyOpenedFile,
    fileBusy,
    onRecentFilesStoreUpdated,
    onWorkspaceBindingChange,
  ]);

  const beginOpen = useCallback(
    (initialDirectory: string | null) => {
      if (fileBusyRef.current || !startupSettledRef.current) return;
      initialDirectoryRef.current = initialDirectory;
      if (isDirtyRef.current) {
        setPendingOpen(true);
        setDiscardPromptOpen(true);
        return;
      }
      void runOpen();
    },
    [runOpen],
  );

  requestMissingFileOpenRef.current = () => {
    const path = filePathRef.current;
    if (!path) return;
    beginOpen(scheduleParentDirectory(path) ?? path);
  };

  const runOpenInNewWindow = useCallback(async () => {
    if (fileBusy || !startupSettledRef.current || !isTauri()) return;
    const initialDirectory = initialDirectoryRef.current;
    initialDirectoryRef.current = null;
    setFileBusy(true);
    try {
      const pick = await openScheduleViaTauri(initialDirectory);
      if (!pick?.path) return;
      const parsed = parseScheduleText(pick.contents);
      if (!parsed.ok) {
        setErrorMessageText(parsed.message);
        return;
      }
      await createScheduleWindowViaTauri(pick.path, pick.contents);
    } catch (error) {
      setErrorMessageText(
        errorMessage(error, "新しいウィンドウで開けませんでした。"),
      );
    } finally {
      setFileBusy(false);
    }
  }, [fileBusy]);

  const requestOpenInNewWindow = useCallback(() => {
    if (fileBusyRef.current || !isTauri()) return;
    void runOpenInNewWindow();
  }, [runOpenInNewWindow]);

  const requestOpen = useCallback(() => {
    beginOpen(null);
  }, [beginOpen]);

  const applyWorkspaceOpenResult = useCallback(
    async (opened: WorkspaceOpened) => {
      await acceptOpenedWorkspaceViaTauri(
        opened.binding.workspacePath,
        opened.schedulePath,
        opened.scheduleContents,
      );
      onWorkspaceBindingChange?.(opened.binding);
      await applyOpenedFile(
        { path: opened.schedulePath, contents: opened.scheduleContents },
        { recordRecent: false },
      );
    },
    [applyOpenedFile, onWorkspaceBindingChange],
  );

  const handleWorkspaceBindingReload = useCallback(
    async (workspacePath: string) => {
      const result = await reloadWorkspaceFromDisk(
        workspacePath,
        filePathRef.current,
      );
      if (result.kind === "error") {
        setErrorDialogTitle(undefined);
        setErrorMessageText(result.message);
        return;
      }
      if (result.kind === "bindingOnly") {
        onWorkspaceBindingChange?.(result.binding);
        return;
      }
      if (isDirtyRef.current) {
        pendingWorkspaceReloadRef.current = result.opened;
        setDiscardPromptOpen(true);
        return;
      }
      await applyWorkspaceOpenResult(result.opened);
    },
    [applyWorkspaceOpenResult, onWorkspaceBindingChange],
  );

  const confirmDiscardAndOpen = useCallback(() => {
    setDiscardPromptOpen(false);
    const workspaceOpened = pendingWorkspaceReloadRef.current;
    if (workspaceOpened) {
      pendingWorkspaceReloadRef.current = null;
      void applyWorkspaceOpenResult(workspaceOpened);
      return;
    }
    const recentPath = pendingRecentPathRef.current;
    if (recentPath) {
      pendingRecentPathRef.current = null;
      void runOpenFromPath(recentPath);
      return;
    }
    const dropPath = pendingDropPathRef.current;
    if (dropPath) {
      pendingDropPathRef.current = null;
      void runOpenFromPath(dropPath);
      return;
    }
    if (!pendingOpen) return;
    setPendingOpen(false);
    void runOpen();
  }, [pendingOpen, runOpen, runOpenFromPath]);

  const cancelDiscard = useCallback(() => {
    initialDirectoryRef.current = null;
    pendingDropPathRef.current = null;
    pendingRecentPathRef.current = null;
    pendingWorkspaceReloadRef.current = null;
    setDiscardPromptOpen(false);
    setPendingOpen(false);
  }, []);

  const readAndValidateDroppedPath = useCallback(async (path: string) => {
    try {
      const contents = await readDroppedScheduleFileViaTauri(path);
      let data: unknown;
      try {
        data = JSON.parse(contents.replace(/^\uFEFF/, ""));
      } catch {
        return { ok: false as const, message: "JSON の形式が正しくありません。" };
      }
      const kind = classifyOpenedJson(data);
      if (kind === "workspace") {
        return { ok: true as const, kind: "workspace" as const, contents };
      }
      if (kind === "unsupported") {
        return {
          ok: false as const,
          message: "スケジュールの JSON を1つだけ開いてください。",
        };
      }
      const parsed = parseScheduleText(contents);
      if (!parsed.ok) {
        return { ok: false as const, message: parsed.message };
      }
      return { ok: true as const, kind: "schedule" as const, contents };
    } catch (error) {
      return {
        ok: false as const,
        message: errorMessage(error, "ファイルを開けませんでした。"),
      };
    }
  }, []);

  const openDroppedScheduleInNewWindow = useCallback(
    async (
      path: string,
      contents: string,
      kind: "schedule" | "workspace" = "schedule",
    ) => {
      if (kind === "workspace") {
        const opened = await openWorkspaceFromFile(path, contents);
        if (!opened.ok) {
          setErrorMessageText(opened.message);
          return;
        }
        await createScheduleWindowViaTauri(
          opened.schedulePath,
          opened.scheduleContents,
          path,
        );
        return;
      }
      const parsed = parseScheduleText(contents);
      if (!parsed.ok) {
        setErrorMessageText(parsed.message);
        return;
      }
      await createScheduleWindowViaTauri(path, contents);
    },
    [],
  );

  const startup = useScheduleStartupRecovery({
    replaceDocument,
    onAfterOpen,
    setFilePath,
    setBrowserFileLabel,
    setBaselineJson,
    setErrorMessageText,
    startupSettledRef,
    setStartupSettled,
    filePathRef,
    baselineJsonRef,
    isDirtyRef,
    fileBusyRef,
    blockDocumentEditsRef,
    clearRecoveryDraft,
    clearExternalReloadPrompt,
    clearInvalidDiskHash,
    setDeferredExternalContents,
    markMissingFilePrompted,
    beginOpen,
    applyOpenedFile,
    restoreFiltersForPath: filterPersistence.restoreFiltersForPath,
    onWorkspaceBindingChange,
  });

  useEffect(() => {
    if (import.meta.env.MODE !== "manual-screenshot") return;
    window.__manualScreenshotApplyOpen = async (pick) => {
      const { setManualScreenshotDiskContents } = await import(
        "../../scripts/manual-screenshot/tauri-invoke"
      );
      setManualScreenshotDiskContents(pick.contents);
      await applyOpenedFile(
        { path: pick.path, contents: pick.contents },
        { restoreFilters: false },
      );
    };
    return () => {
      delete window.__manualScreenshotApplyOpen;
    };
  }, [applyOpenedFile]);

  const peerNotice = useSchedulePeerNotice({
    filePath,
    displayFileName,
    onWindowFocused: () => {
      void syncLiveRecoveryRef.current().catch((error) => {
        setErrorMessageText(
          errorMessage(error, "復旧用の控えを保存できませんでした。"),
        );
      });
      void syncLiveFilterRef.current().catch((error) => {
        setErrorMessageText(
          errorMessage(error, "絞り込みの記録を保存できませんでした。"),
        );
      });
    },
  });
  notifyPeersRef.current = peerNotice.notifyPeers;

  const writeRecoveryDraftNowRef = useRef(writeRecoveryDraftNow);
  writeRecoveryDraftNowRef.current = writeRecoveryDraftNow;
  const clearRecoveryDraftRef = useRef(clearRecoveryDraft);
  clearRecoveryDraftRef.current = clearRecoveryDraft;

  useEffect(() => {
    if (isTauri()) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void getCurrentWindow()
      .onCloseRequested(async (event) => {
        if (allowCloseRef.current) return;
        if (applicationUpdatingRef.current) return;
        if (!filePathRef.current) {
          if (isDirtyRef.current && quitDiscardedRef.current) {
            event.preventDefault();
            try {
              await clearLastSchedulePathViaTauri();
              quitDiscardedRef.current = false;
              allowCloseRef.current = true;
              await finalizeWindowClose();
            } catch (error) {
              allowCloseRef.current = false;
              setErrorMessageText(
                errorMessage(error, "前回のファイルの記録を削除できませんでした。"),
              );
              if (applicationQuitRef.current) {
                applicationQuitRef.current = false;
                void cancelApplicationQuitViaTauri();
              }
            }
            return;
          }
          if (isDirtyRef.current) {
            event.preventDefault();
            setClosePromptOpen(true);
            return;
          }
          if (!startup.startupSettledRef.current) return;
          event.preventDefault();
          try {
            await clearLastSchedulePathViaTauri();
            allowCloseRef.current = true;
            await finalizeWindowClose();
          } catch (error) {
            allowCloseRef.current = false;
            setErrorMessageText(
              errorMessage(error, "前回のファイルの記録を削除できませんでした。"),
            );
            if (applicationQuitRef.current) {
              applicationQuitRef.current = false;
              void cancelApplicationQuitViaTauri();
            }
          }
          return;
        }
        event.preventDefault();
        try {
          const action = await recoveryCloseActionViaTauri(isDirtyRef.current);
          if (action === "write") await writeRecoveryDraftNowRef.current();
          else if (action === "delete") await clearRecoveryDraftRef.current();
          await flushFilterOnCloseRef.current();
          allowCloseRef.current = true;
          await finalizeWindowClose();
        } catch (error) {
          allowCloseRef.current = false;
          setErrorMessageText(
            errorMessage(error, "復旧用の控えを保存できませんでした。"),
          );
          if (applicationQuitRef.current) {
            applicationQuitRef.current = false;
            void cancelApplicationQuitViaTauri();
          }
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn();
          return;
        }
        unlisten = fn;
      });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [startup.startupSettledRef]);

  useEffect(() => {
    if (!isTauri()) return;
    let unlistenQuit: (() => void) | undefined;
    let unlistenCancel: (() => void) | undefined;
    let cancelled = false;
    void listen("application-quit-requested", () => {
      applicationQuitRef.current = true;
      if (!filePathRef.current && isDirtyRef.current) {
        closePromptForQuitRef.current = true;
        setClosePromptOpen(true);
        return;
      }
      void acceptApplicationQuitViaTauri();
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlistenQuit = fn;
    });
    void listen("application-quit-cancelled", () => {
      applicationQuitRef.current = false;
      closePromptForQuitRef.current = false;
      quitDiscardedRef.current = false;
      setClosePromptOpen(false);
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlistenCancel = fn;
    });
    return () => {
      cancelled = true;
      unlistenQuit?.();
      unlistenCancel?.();
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let unlistenRecovery: (() => void) | undefined;
    let cancelled = false;
    void listen("application-update-write-recovery", () => {
      void (async () => {
        applicationUpdatingRef.current = true;
        try {
          if (filePathRef.current) {
            const action = await recoveryCloseActionViaTauri(isDirtyRef.current);
            if (action === "write") await writeRecoveryDraftNowRef.current();
            else if (action === "delete") await clearRecoveryDraftRef.current();
            await flushFilterOnCloseRef.current();
          }
          await completeApplicationUpdateRecoveryViaTauri();
        } catch (error) {
          applicationUpdatingRef.current = false;
          setErrorMessageText(
            errorMessage(error, "復旧用の控えを保存できませんでした。"),
          );
          void cancelApplicationUpdateViaTauri();
        }
      })();
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlistenRecovery = fn;
    });
    return () => {
      cancelled = true;
      unlistenRecovery?.();
    };
  }, []);

  const waitForBlockingFileDialogs = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const tick = () => {
        if (
          !discardPromptOpenRef.current &&
          !externalChangeOpenRef.current
        ) {
          resolve();
          return;
        }
        window.setTimeout(tick, 50);
      };
      tick();
    });
  }, []);

  const prepareForApplicationUpdate = useCallback(async (): Promise<boolean> => {
    if (!isTauri()) return false;
    await waitForBlockingFileDialogs();
    if (!filePathRef.current && isDirtyRef.current) {
      return await new Promise<boolean>((resolve) => {
        updatePrepareResolverRef.current = resolve;
        closePromptForUpdateRef.current = true;
        setClosePromptForUpdate(true);
        setClosePromptOpen(true);
      });
    }
    return true;
  }, [waitForBlockingFileDialogs]);

  const onUpdatePromptCancel = useCallback(() => {
    applicationUpdatingRef.current = false;
    if (!closePromptForUpdateRef.current) return;
    closePromptForUpdateRef.current = false;
    setClosePromptForUpdate(false);
    setClosePromptOpen(false);
    updatePrepareResolverRef.current?.(false);
    updatePrepareResolverRef.current = null;
  }, []);

  const confirmDiscardAndClose = useCallback(() => {
    setClosePromptOpen(false);
    if (!isTauri()) return;
    const forUpdate = closePromptForUpdateRef.current;
    const forQuit = closePromptForQuitRef.current;
    closePromptForUpdateRef.current = false;
    setClosePromptForUpdate(false);
    closePromptForQuitRef.current = false;
    void (async () => {
      try {
        await clearLastSchedulePathViaTauri();
      } catch (error) {
        setErrorMessageText(
          errorMessage(error, "前回のファイルの記録を削除できませんでした。"),
        );
        if (forQuit) {
          applicationQuitRef.current = false;
          void cancelApplicationQuitViaTauri();
        }
        if (forUpdate) {
          updatePrepareResolverRef.current?.(false);
          updatePrepareResolverRef.current = null;
          void cancelApplicationUpdateViaTauri();
        }
        return;
      }
      if (forUpdate) {
        updatePrepareResolverRef.current?.(true);
        updatePrepareResolverRef.current = null;
        return;
      }
      if (forQuit) {
        quitDiscardedRef.current = true;
        await acceptApplicationQuitViaTauri();
        return;
      }
      allowCloseRef.current = true;
      await finalizeWindowClose();
    })();
  }, []);

  const cancelClose = useCallback(() => {
    setClosePromptOpen(false);
    if (closePromptForUpdateRef.current) {
      closePromptForUpdateRef.current = false;
      setClosePromptForUpdate(false);
      updatePrepareResolverRef.current?.(false);
      updatePrepareResolverRef.current = null;
      void cancelApplicationUpdateViaTauri();
      return;
    }
    if (!closePromptForQuitRef.current) return;
    closePromptForQuitRef.current = false;
    allowCloseRef.current = false;
    void cancelApplicationQuitViaTauri();
  }, []);

  const dismissError = useCallback(() => {
    setErrorMessageText(null);
    setErrorDialogTitle(undefined);
  }, []);

  const showError = useCallback((message: string, title?: string) => {
    setErrorDialogTitle(title);
    setErrorMessageText(message);
  }, []);

  const startupRecoveryDialogOpen =
    startup.recoveryConflictOpen ||
    startup.recoveryInvalidOpen ||
    startup.missingScheduleLabel != null;

  useEffect(() => {
    if (!isTauri() || !startupSettled || startupRecoveryDialogOpen) return;
    void reportExternalScheduleDropReadyViaTauri();
  }, [startupSettled, startupRecoveryDialogOpen]);

  useScheduleDropOpen({
    dropGate: {
      startupSettled,
      startupRecoveryDialogOpen,
      fileBusy,
      dialogOpen:
        discardPromptOpen ||
        closePromptOpen ||
        externalChangeOpen ||
        externalReloadOpen,
      reorderDragging: sidebarReorderDragging,
    },
    handlers: {
      beginOpenFromDroppedPath,
      openDroppedScheduleInNewWindow,
      setDropErrorMessage: setErrorMessageText,
      readAndValidateDroppedPath,
    },
  });

  return {
    filePath,
    displayFileName,
    saveStatusLabel,
    statusLabel,
    reloadNotice,
    mergeNotice,
    diskUpdatedAgain,
    externalReloadAssessment,
    externalReloadReview,
    showDeferredReload,
    isDirty,
    fileBusy,
    startupSettled,
    errorMessage: errorMessageText,
    errorDialogTitle,
    discardPromptOpen,
    closePromptOpen,
    closePromptForUpdate,
    prepareForApplicationUpdate,
    onUpdatePromptCancel,
    externalChangeOpen,
    externalReloadOpen,
    recoveryConflictOpen: startup.recoveryConflictOpen,
    recoveryConflictLabel: startup.recoveryConflictLabel,
    recoveryConflictMissing: startup.recoveryConflictMissing,
    missingScheduleLabel: startup.missingScheduleLabel,
    recoveryInvalidOpen: startup.recoveryInvalidOpen,
    recoveryInvalidMessage: startup.recoveryInvalidMessage,
    confirmRecoveryOpenDisk: startup.confirmRecoveryOpenDisk,
    confirmRecoveryRestoreEdits: startup.confirmRecoveryRestoreEdits,
    dismissMissingSchedule: startup.dismissMissingSchedule,
    dismissRecoveryInvalid: startup.dismissRecoveryInvalid,
    discardRecoveryDraft: startup.discardRecoveryDraft,
    requestOpen,
    requestOpenFromRecent: beginOpenFromRecentPath,
    requestOpenInNewWindow,
    save,
    confirmDiscardAndOpen,
    cancelDiscard,
    confirmDiscardAndClose,
    cancelClose,
    confirmExternalOverwrite,
    confirmExternalSaveAs,
    cancelExternalChange,
    confirmExternalReload,
    keepLocalEditsOnExternalReload,
    requestDeferredConfirm,
    confirmBaselineMerge,
    onHistoryUndoApplied,
    onHistoryRedoApplied,
    dismissError,
    showError,
    handleWorkspaceBindingReload,
    currentJson,
    baselineJson,
    peerNotice,
  };
}
