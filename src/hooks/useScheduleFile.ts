import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type {
  Category,
  Milestone,
  MilestoneGroup,
  ScheduleDocument,
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
} from "../model/scheduleFile";
import { useScheduleExternalReload } from "./scheduleFile/useScheduleExternalReload";
import { useScheduleRecoveryDraft } from "./scheduleFile/useScheduleRecoveryDraft";
import { useScheduleSave } from "./scheduleFile/useScheduleSave";
import { useScheduleStartupRecovery } from "./scheduleFile/useScheduleStartupRecovery";
import { useSchedulePeerNotice } from "./useSchedulePeerNotice";
import { finalizeWindowClose } from "./useWindowSession";
import { listen } from "@tauri-apps/api/event";
import {
  acceptApplicationQuitViaTauri,
  cancelApplicationQuitViaTauri,
  createScheduleWindowViaTauri,
  recoveryCloseActionViaTauri,
  releaseScheduleRecoveryViaTauri,
} from "../model/windowSession";

export type FileStatusTag = "sample" | "saved" | "unsaved";

type UseScheduleFileOptions = {
  title: string;
  categories: Category[];
  milestoneGroups: MilestoneGroup[];
  milestones: Milestone[];
  replaceDocument: (document: ScheduleDocument) => void;
  reloadDocumentFromDisk: (document: ScheduleDocument) => void;
  onAfterOpen: () => void;
  initialBaselineJson: string;
  hasOpenEditDialog: boolean;
  blockDocumentEditsRef: { current: boolean };
};

export function useScheduleFile({
  title,
  categories,
  milestoneGroups,
  milestones,
  replaceDocument,
  reloadDocumentFromDisk,
  onAfterOpen,
  initialBaselineJson,
  hasOpenEditDialog,
  blockDocumentEditsRef,
}: UseScheduleFileOptions) {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [browserFileLabel, setBrowserFileLabel] = useState<string | null>(null);
  const [baselineJson, setBaselineJson] = useState(initialBaselineJson);
  const [errorMessageText, setErrorMessageText] = useState<string | null>(null);
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [closePromptOpen, setClosePromptOpen] = useState(false);
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
      serializeScheduleDocument(title, categories, milestoneGroups, milestones),
    [categories, milestoneGroups, milestones, title],
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
    title,
    filePath,
    setFilePath,
    setBrowserFileLabel,
    setBaselineJson,
    baselineJsonRef,
    fileBusyRef,
    setFileBusy,
    setErrorMessageText,
    clearRecoveryDraft,
    clearExternalReloadPromptRef,
    clearInvalidDiskHashRef,
  });

  const notifyPeersRef = useRef<(status: "applied" | "pending" | "cleared") => void>(
    () => {},
  );
  const closePromptForQuitRef = useRef(false);
  const quitDiscardedRef = useRef(false);
  const applicationQuitRef = useRef(false);
  const syncLiveRecoveryRef = useRef(syncLiveRecovery);
  syncLiveRecoveryRef.current = syncLiveRecovery;

  const externalReload = useScheduleExternalReload({
    filePath,
    reloadDocumentFromDisk,
    setBaselineJson,
    setErrorMessageText,
    baselineJsonRef,
    isDirtyRef,
    hasOpenEditDialogRef,
    fileBusyRef,
    pausePollRef,
    clearRecoveryDraft,
    requestMissingFileOpenRef,
    notifyPeersRef,
  });
  clearExternalReloadPromptRef.current = externalReload.clearExternalReloadPrompt;
  clearInvalidDiskHashRef.current = externalReload.clearInvalidDiskHash;

  const statusTag: FileStatusTag = useMemo(() => {
    if (isDirty) return "unsaved";
    if (filePath || browserFileLabel) return "saved";
    return "sample";
  }, [browserFileLabel, filePath, isDirty]);

  const statusLabel = useMemo(() => {
    if (externalReload.reloadNotice) return "ファイルを反映しました";
    if (statusTag === "unsaved") return "未保存";
    if (statusTag === "saved") {
      return scheduleJsonFilename(filePath) ?? browserFileLabel ?? "保存済み";
    }
    return "サンプルデータ";
  }, [browserFileLabel, externalReload.reloadNotice, filePath, statusTag]);

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
    (pick: {
      path: string | null;
      displayName?: string | null;
      contents: string;
    }) => {
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
      externalReload.clearExternalReloadPrompt();
      externalReload.resetPollTracking();
      baselineJsonRef.current = parsed.canonicalJson;
      onAfterOpen();
      if (isTauri() && previousPath && previousPath !== pick.path) {
        void releaseScheduleRecoveryViaTauri(previousPath).catch((error) => {
          setErrorMessageText(
            errorMessage(error, "復旧用の控えを削除できませんでした。"),
          );
        });
      }
      return true;
    },
    [
      baselineJsonRef,
      externalReload,
      onAfterOpen,
      replaceDocument,
    ],
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
      const parsed = parseScheduleText(pick.contents);
      if (!parsed.ok) {
        setErrorMessageText(parsed.message);
        return;
      }
      if (isTauri() && pick.path) {
        await acceptOpenedScheduleViaTauri(pick.path, pick.contents);
      }
      applyOpenedFile(pick);
    } catch (error) {
      setErrorMessageText(errorMessage(error, "ファイルを開けませんでした。"));
    } finally {
      setFileBusy(false);
    }
  }, [applyOpenedFile, fileBusy]);

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

  const confirmDiscardAndOpen = useCallback(() => {
    setDiscardPromptOpen(false);
    if (!pendingOpen) return;
    setPendingOpen(false);
    void runOpen();
  }, [pendingOpen, runOpen]);

  const cancelDiscard = useCallback(() => {
    initialDirectoryRef.current = null;
    setDiscardPromptOpen(false);
    setPendingOpen(false);
  }, []);

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
    clearExternalReloadPrompt: externalReload.clearExternalReloadPrompt,
    clearInvalidDiskHash: externalReload.clearInvalidDiskHash,
    setDeferredExternalContents: externalReload.setDeferredExternalContents,
    markMissingFilePrompted: externalReload.markMissingFilePrompted,
    beginOpen,
    applyOpenedFile,
  });

  const peerNotice = useSchedulePeerNotice({
    filePath,
    displayFileName,
    onWindowFocused: () => {
      void syncLiveRecoveryRef.current().catch((error) => {
        setErrorMessageText(
          errorMessage(error, "復旧用の控えを保存できませんでした。"),
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

  const confirmDiscardAndClose = useCallback(() => {
    setClosePromptOpen(false);
    if (!isTauri()) return;
    const forQuit = closePromptForQuitRef.current;
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
    if (!closePromptForQuitRef.current) return;
    closePromptForQuitRef.current = false;
    allowCloseRef.current = false;
    void cancelApplicationQuitViaTauri();
  }, []);

  const dismissError = useCallback(() => setErrorMessageText(null), []);

  return {
    filePath,
    displayFileName,
    saveStatusLabel,
    statusLabel,
    reloadNotice: externalReload.reloadNotice,
    showDeferredReload: externalReload.showDeferredReload,
    isDirty,
    fileBusy,
    startupSettled,
    errorMessage: errorMessageText,
    discardPromptOpen,
    closePromptOpen,
    externalChangeOpen,
    externalReloadOpen: externalReload.externalReloadOpen,
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
    requestOpenInNewWindow,
    save,
    confirmDiscardAndOpen,
    cancelDiscard,
    confirmDiscardAndClose,
    cancelClose,
    confirmExternalOverwrite,
    confirmExternalSaveAs,
    cancelExternalChange,
    confirmExternalReload: externalReload.confirmExternalReload,
    keepLocalEditsOnExternalReload: externalReload.keepLocalEditsOnExternalReload,
    requestDeferredReload: externalReload.requestDeferredReload,
    dismissError,
    currentJson,
    peerNotice,
  };
}
