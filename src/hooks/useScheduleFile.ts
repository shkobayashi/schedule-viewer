import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Category, Milestone, ScheduleDocument } from "../model/types";
import { errorMessage } from "../model/errors";
import { decideExternalReload } from "../model/scheduleExternalReload";
import {
  actionIgnoresDraft,
  decideRecoveryStartup,
} from "../model/scheduleRecovery";
import {
  acceptOpenedScheduleViaTauri,
  acknowledgeScheduleFileContentsViaTauri,
  clearLastSchedulePathViaTauri,
  deleteScheduleRecoveryViaTauri,
  DISK_HASH_MISMATCH,
  downloadScheduleJson,
  hashTextSha256,
  isTauri,
  openScheduleViaBrowserInput,
  openScheduleViaTauri,
  parseScheduleText,
  pollScheduleFileUpdateViaTauri,
  readLastScheduleFileViaTauri,
  readScheduleRecoveryViaTauri,
  saveScheduleViaTauri,
  scheduleJsonFilename,
  scheduleParentDirectory,
  serializeScheduleDocument,
  suggestedJsonFilename,
  checkScheduleFileChangedViaTauri,
  writeScheduleRecoveryViaTauri,
} from "../model/scheduleFile";

export type FileStatusTag = "sample" | "saved" | "unsaved";

const EXTERNAL_RELOAD_POLL_MS = 1500;
const RELOAD_NOTICE_MS = 4000;
const RECOVERY_DEBOUNCE_MS = 1000;

type RecoveryConflictPayload = {
  path: string;
  diskContents: string | null;
  document: ScheduleDocument;
  baselineJson: string;
  missing: boolean;
};

type UseScheduleFileOptions = {
  title: string;
  categories: Category[];
  milestones: Milestone[];
  replaceDocument: (document: ScheduleDocument) => void;
  reloadDocumentFromDisk: (document: ScheduleDocument) => void;
  onAfterOpen: () => void;
  initialBaselineJson: string;
  hasOpenEditDialog: boolean;
};

export function useScheduleFile({
  title,
  categories,
  milestones,
  replaceDocument,
  reloadDocumentFromDisk,
  onAfterOpen,
  initialBaselineJson,
  hasOpenEditDialog,
}: UseScheduleFileOptions) {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [browserFileLabel, setBrowserFileLabel] = useState<string | null>(null);
  const [baselineJson, setBaselineJson] = useState(initialBaselineJson);
  const [errorMessageText, setErrorMessageText] = useState<string | null>(null);
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const [externalChangeOpen, setExternalChangeOpen] = useState(false);
  const [externalReloadOpen, setExternalReloadOpen] = useState(false);
  const [pendingExternalContents, setPendingExternalContents] = useState<
    string | null
  >(null);
  const [deferredExternalContents, setDeferredExternalContents] = useState<
    string | null
  >(null);
  const [reloadNotice, setReloadNotice] = useState(false);
  const [pendingSaveAs, setPendingSaveAs] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [recoveryConflictOpen, setRecoveryConflictOpen] = useState(false);
  const [recoveryInvalidOpen, setRecoveryInvalidOpen] = useState(false);
  const [recoveryInvalidMessage, setRecoveryInvalidMessage] = useState<
    string | null
  >(null);
  const [recoveryConflictLabel, setRecoveryConflictLabel] = useState<
    string | null
  >(null);
  const [recoveryConflictMissing, setRecoveryConflictMissing] = useState(false);
  const [missingScheduleLabel, setMissingScheduleLabel] = useState<
    string | null
  >(null);
  const recoveryConflictRef = useRef<RecoveryConflictPayload | null>(null);
  const initialDirectoryRef = useRef<string | null>(null);
  const startupSettledRef = useRef(false);
  const recoveryQueueRef = useRef(Promise.resolve());
  const recoveryEpochRef = useRef(0);
  const recoveryStartupRef = useRef(0);

  const currentJson = useMemo(
    () => serializeScheduleDocument(title, categories, milestones),
    [categories, milestones, title],
  );

  const isDirty = currentJson !== baselineJson;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const currentJsonRef = useRef(currentJson);
  currentJsonRef.current = currentJson;
  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;
  const allowCloseRef = useRef(false);
  const baselineJsonRef = useRef(baselineJson);
  baselineJsonRef.current = baselineJson;
  const lastInvalidDiskHashRef = useRef<string | null>(null);
  const pollReadFailuresRef = useRef(0);
  const missingFilePromptedRef = useRef(false);
  const requestMissingFileOpenRef = useRef<() => void>(() => {});
  const hasOpenEditDialogRef = useRef(hasOpenEditDialog);
  hasOpenEditDialogRef.current = hasOpenEditDialog;
  const externalReloadOpenRef = useRef(externalReloadOpen);
  externalReloadOpenRef.current = externalReloadOpen;
  const fileBusyRef = useRef(fileBusy);
  fileBusyRef.current = fileBusy;
  const pausePollRef = useRef(false);
  const reloadNoticeTimerRef = useRef<number | null>(null);
  const suppressedDiskRef = useRef<string | null>(null);

  const statusTag: FileStatusTag = useMemo(() => {
    if (isDirty) return "unsaved";
    if (filePath || browserFileLabel) return "saved";
    return "sample";
  }, [browserFileLabel, filePath, isDirty]);

  const statusLabel = useMemo(() => {
    if (reloadNotice) return "ファイルを反映しました";
    if (statusTag === "unsaved") return "未保存";
    if (statusTag === "saved") {
      return (
        scheduleJsonFilename(filePath) ?? browserFileLabel ?? "保存済み"
      );
    }
    return "サンプルデータ";
  }, [browserFileLabel, filePath, reloadNotice, statusTag]);

  const showDeferredReload = deferredExternalContents != null;

  const clearExternalReloadPrompt = useCallback(() => {
    setPendingExternalContents(null);
    setDeferredExternalContents(null);
    setExternalReloadOpen(false);
    suppressedDiskRef.current = null;
  }, []);

  const enqueueRecoveryIo = useCallback((task: () => Promise<void>) => {
    const run = recoveryQueueRef.current.then(task, task);
    recoveryQueueRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  const clearRecoveryDraft = useCallback(async () => {
    if (!isTauri()) return;
    recoveryEpochRef.current += 1;
    const epoch = recoveryEpochRef.current;
    await enqueueRecoveryIo(async () => {
      if (recoveryEpochRef.current !== epoch) return;
      await deleteScheduleRecoveryViaTauri();
    });
  }, [enqueueRecoveryIo]);

  const writeRecoveryDraftNow = useCallback(async () => {
    if (!isTauri()) return;
    const epoch = recoveryEpochRef.current;
    await enqueueRecoveryIo(async () => {
      if (recoveryEpochRef.current !== epoch) return;
      const path = filePathRef.current;
      if (!path || !isDirtyRef.current) return;
      const parsed = parseScheduleText(currentJsonRef.current);
      if (!parsed.ok) return;
      const baseline = baselineJsonRef.current;
      const documentJson = parsed.canonicalJson;
      if (
        recoveryEpochRef.current !== epoch ||
        filePathRef.current !== path ||
        !isDirtyRef.current
      ) {
        return;
      }
      await writeScheduleRecoveryViaTauri({
        path,
        baselineJson: baseline,
        documentJson,
      });
      if (recoveryEpochRef.current !== epoch) {
        await deleteScheduleRecoveryViaTauri();
      }
    });
  }, [enqueueRecoveryIo]);

  const applyRecoverySession = useCallback(
    async (
      session: {
        path: string;
        document: ScheduleDocument;
        baselineJson: string;
        diskContents: string;
      },
      options?: { deferDisk?: boolean; abortIfMovedOn?: boolean },
    ): Promise<boolean> => {
      await acceptOpenedScheduleViaTauri(session.path, session.diskContents);
      if (
        options?.abortIfMovedOn &&
        (filePathRef.current != null || isDirtyRef.current)
      ) {
        return false;
      }
      replaceDocument(session.document);
      filePathRef.current = session.path;
      setFilePath(session.path);
      setBrowserFileLabel(null);
      setBaselineJson(session.baselineJson);
      baselineJsonRef.current = session.baselineJson;
      setPendingExternalContents(null);
      setExternalReloadOpen(false);
      lastInvalidDiskHashRef.current = null;
      suppressedDiskRef.current = null;
      setDeferredExternalContents(
        options?.deferDisk ? session.diskContents : null,
      );
      onAfterOpen();
      return true;
    },
    [onAfterOpen, replaceDocument],
  );

  const flashReloadNotice = useCallback(() => {
    if (reloadNoticeTimerRef.current != null) {
      window.clearTimeout(reloadNoticeTimerRef.current);
    }
    setReloadNotice(true);
    reloadNoticeTimerRef.current = window.setTimeout(() => {
      setReloadNotice(false);
      reloadNoticeTimerRef.current = null;
    }, RELOAD_NOTICE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (reloadNoticeTimerRef.current != null) {
        window.clearTimeout(reloadNoticeTimerRef.current);
      }
    };
  }, []);

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
    if (!isTauri() || !filePath || !isDirty) return;
    const id = window.setTimeout(() => {
      void writeRecoveryDraftNow().catch((error) => {
        setErrorMessageText(
          errorMessage(error, "復旧用の控えを保存できませんでした。"),
        );
      });
    }, RECOVERY_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [currentJson, filePath, isDirty, writeRecoveryDraftNow]);

  useEffect(() => {
    if (!isTauri() || !filePath || isDirty) return;
    void clearRecoveryDraft().catch((error) => {
      setErrorMessageText(
        errorMessage(error, "復旧用の控えを削除できませんでした。"),
      );
    });
  }, [clearRecoveryDraft, filePath, isDirty]);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    const startupId = recoveryStartupRef.current + 1;
    recoveryStartupRef.current = startupId;
    fileBusyRef.current = true;
    setFileBusy(true);
    const releaseStartupBusy = () => {
      if (cancelled || recoveryStartupRef.current !== startupId) return;
      startupSettledRef.current = true;
      fileBusyRef.current = false;
      setFileBusy(false);
    };
    void (async () => {
      try {
        const last = await readLastScheduleFileViaTauri();
        const draftText = await readScheduleRecoveryViaTauri();
        if (cancelled || recoveryStartupRef.current !== startupId) return;
        if (
          last == null &&
          (draftText == null || draftText.length === 0)
        ) {
          releaseStartupBusy();
          return;
        }
        const action = decideRecoveryStartup(
          last?.path ?? null,
          draftText,
          last?.contents ?? null,
          last?.error ?? null,
        );
        if (cancelled || recoveryStartupRef.current !== startupId) return;
        const userMovedOn =
          filePathRef.current != null || isDirtyRef.current;
        if (action.kind === "none" || userMovedOn) {
          releaseStartupBusy();
          return;
        }
        if (actionIgnoresDraft(action)) {
          await deleteScheduleRecoveryViaTauri();
        }
        if (cancelled || recoveryStartupRef.current !== startupId) return;

        switch (action.kind) {
          case "invalidDraft":
            setRecoveryInvalidMessage(action.message);
            setRecoveryInvalidOpen(true);
            releaseStartupBusy();
            return;
          case "missingNotice":
            setMissingScheduleLabel(
              scheduleJsonFilename(action.path) ?? action.path,
            );
            releaseStartupBusy();
            return;
          case "invalidDisk":
            setRecoveryInvalidMessage(
              `${action.message}（${scheduleJsonFilename(action.path) ?? action.path}）`,
            );
            setRecoveryInvalidOpen(true);
            releaseStartupBusy();
            return;
          case "openSaved": {
            const applied = await applyRecoverySession(
              {
                path: action.path,
                document: action.document,
                baselineJson: action.baselineJson,
                diskContents: action.diskContents,
              },
              { abortIfMovedOn: true },
            );
            if (applied) {
              await clearRecoveryDraft();
            }
            releaseStartupBusy();
            return;
          }
          case "restore":
            await applyRecoverySession(
              {
                path: action.path,
                document: action.document,
                baselineJson: action.baselineJson,
                diskContents: action.diskContents,
              },
              { abortIfMovedOn: true },
            );
            releaseStartupBusy();
            return;
          case "conflict":
            recoveryConflictRef.current = {
              path: action.path,
              diskContents: action.diskContents,
              document: action.document,
              baselineJson: action.draft.baselineJson,
              missing: false,
            };
            setRecoveryConflictMissing(false);
            setRecoveryConflictLabel(
              scheduleJsonFilename(action.path) ?? action.path,
            );
            setRecoveryConflictOpen(true);
            releaseStartupBusy();
            return;
          case "missingWithEdits": {
            const applied = await applyRecoverySession(
              {
                path: action.path,
                document: action.document,
                baselineJson: action.baselineJson,
                diskContents: action.baselineJson,
              },
              { abortIfMovedOn: true },
            );
            if (!applied) {
              releaseStartupBusy();
              return;
            }
            missingFilePromptedRef.current = true;
            recoveryConflictRef.current = {
              path: action.path,
              diskContents: null,
              document: action.document,
              baselineJson: action.baselineJson,
              missing: true,
            };
            setRecoveryConflictMissing(true);
            setRecoveryConflictLabel(
              scheduleJsonFilename(action.path) ?? action.path,
            );
            setRecoveryConflictOpen(true);
            releaseStartupBusy();
            return;
          }
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessageText(
            errorMessage(error, "前回のファイルを読み込めませんでした。"),
          );
        }
        releaseStartupBusy();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyRecoverySession, clearRecoveryDraft]);

  const writeRecoveryDraftNowRef = useRef(writeRecoveryDraftNow);
  writeRecoveryDraftNowRef.current = writeRecoveryDraftNow;

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void getCurrentWindow()
      .onCloseRequested(async (event) => {
        if (allowCloseRef.current) return;
        if (!filePathRef.current) {
          if (isDirtyRef.current) {
            event.preventDefault();
            setClosePromptOpen(true);
            return;
          }
          if (!startupSettledRef.current) return;
          try {
            await clearLastSchedulePathViaTauri();
          } catch (error) {
            event.preventDefault();
            setErrorMessageText(
              errorMessage(error, "前回のファイルの記録を削除できませんでした。"),
            );
          }
          return;
        }
        if (!isDirtyRef.current) return;
        try {
          await writeRecoveryDraftNowRef.current();
        } catch (error) {
          event.preventDefault();
          setErrorMessageText(
            errorMessage(error, "復旧用の控えを保存できませんでした。"),
          );
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
  }, []);

  const acknowledgeDisk = useCallback(async (diskContents: string) => {
    if (!isTauri()) return;
    await acknowledgeScheduleFileContentsViaTauri(diskContents);
  }, []);

  const applyExternalReload = useCallback(
    async (diskContents: string, canonicalJson: string, document: ScheduleDocument) => {
      reloadDocumentFromDisk(document);
      setBaselineJson(canonicalJson);
      setDeferredExternalContents(null);
      setPendingExternalContents(null);
      setExternalReloadOpen(false);
      lastInvalidDiskHashRef.current = null;
      suppressedDiskRef.current = null;
      baselineJsonRef.current = canonicalJson;
      isDirtyRef.current = false;
      flashReloadNotice();
      await acknowledgeDisk(diskContents);
      await clearRecoveryDraft();
    },
    [acknowledgeDisk, clearRecoveryDraft, flashReloadNotice, reloadDocumentFromDisk],
  );

  const processDiskContents = useCallback(
    async (diskContents: string) => {
      if (diskContents === suppressedDiskRef.current) return;
      const decision = decideExternalReload(
        diskContents,
        baselineJsonRef.current,
        isDirtyRef.current,
        hasOpenEditDialogRef.current,
      );

      if (pausePollRef.current || fileBusyRef.current) return;

      if (decision.kind === "invalid") {
        setPendingExternalContents(null);
        setExternalReloadOpen(false);
        const diskHash = await hashTextSha256(decision.diskContents);
        if (lastInvalidDiskHashRef.current === diskHash) {
          return;
        }
        lastInvalidDiskHashRef.current = diskHash;
        await acknowledgeDisk(decision.diskContents);
        setErrorMessageText(decision.message);
        return;
      }

      lastInvalidDiskHashRef.current = null;

      if (decision.kind === "noop") {
        clearExternalReloadPrompt();
        await acknowledgeDisk(diskContents);
        return;
      }

      if (diskContents === suppressedDiskRef.current) return;

      if (decision.kind === "apply") {
        if (
          pausePollRef.current ||
          fileBusyRef.current ||
          diskContents === suppressedDiskRef.current
        ) {
          return;
        }
        await applyExternalReload(
          diskContents,
          decision.canonicalJson,
          decision.document,
        );
        return;
      }

      if (diskContents === suppressedDiskRef.current) return;
      setPendingExternalContents(diskContents);
      if (!externalReloadOpenRef.current) {
        setExternalReloadOpen(true);
      }
    },
    [acknowledgeDisk, applyExternalReload, clearExternalReloadPrompt],
  );

  useEffect(() => {
    if (!isTauri() || !filePath) return;
    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (
        cancelled ||
        inFlight ||
        fileBusyRef.current ||
        pausePollRef.current
      ) {
        return;
      }
      inFlight = true;
      try {
        const update = await pollScheduleFileUpdateViaTauri();
        if (cancelled || fileBusyRef.current || pausePollRef.current) {
          return;
        }
        pollReadFailuresRef.current = 0;
        missingFilePromptedRef.current = false;
        if (!update) return;
        await processDiskContents(update.contents);
      } catch {
        pollReadFailuresRef.current += 1;
        if (
          pollReadFailuresRef.current >= 5 &&
          !missingFilePromptedRef.current &&
          !fileBusyRef.current &&
          !pausePollRef.current
        ) {
          missingFilePromptedRef.current = true;
          requestMissingFileOpenRef.current();
        }
      } finally {
        inFlight = false;
      }
    };

    const id = window.setInterval(() => {
      void tick();
    }, EXTERNAL_RELOAD_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [filePath, processDiskContents]);

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
      replaceDocument(parsed.document);
      setFilePath(pick.path);
      setBrowserFileLabel(pick.path ? null : (pick.displayName ?? null));
      setBaselineJson(parsed.canonicalJson);
      setDeferredExternalContents(null);
      setPendingExternalContents(null);
      setExternalReloadOpen(false);
      lastInvalidDiskHashRef.current = null;
      suppressedDiskRef.current = null;
      pollReadFailuresRef.current = 0;
      missingFilePromptedRef.current = false;
      baselineJsonRef.current = parsed.canonicalJson;
      onAfterOpen();
      void clearRecoveryDraft().catch((error) => {
        setErrorMessageText(
          errorMessage(error, "復旧用の控えを削除できませんでした。"),
        );
      });
      return true;
    },
    [clearRecoveryDraft, onAfterOpen, replaceDocument],
  );

  const runOpen = useCallback(async () => {
    if (fileBusy) return;
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
      setErrorMessageText(
        errorMessage(error, "ファイルを開けませんでした。"),
      );
    } finally {
      setFileBusy(false);
    }
  }, [applyOpenedFile, fileBusy]);

  const beginOpen = useCallback(
    (initialDirectory: string | null) => {
      if (fileBusyRef.current) return;
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

  const performSave = useCallback(
    async (saveAs: boolean, skipExternalCheck = false) => {
      const parsed = parseScheduleText(currentJson);
      if (!parsed.ok) {
        setErrorMessageText(parsed.message);
        if (skipExternalCheck) pausePollRef.current = false;
        return;
      }
      const contents = parsed.canonicalJson;
      const suggested = suggestedJsonFilename(title);
      pausePollRef.current = true;
      let holdPause = false;

      try {
        if (isTauri()) {
          const choosePath = saveAs || filePath == null;
          if (!choosePath && !skipExternalCheck && filePath) {
            try {
              const changed = await checkScheduleFileChangedViaTauri();
              if (changed) {
                setPendingSaveAs(saveAs);
                setExternalChangeOpen(true);
                holdPause = true;
                return;
              }
            } catch (error) {
              setErrorMessageText(
                errorMessage(error, "ファイルの状態を確認できませんでした。"),
              );
              return;
            }
          }
          setFileBusy(true);
          try {
            const writtenPath = await saveScheduleViaTauri(
              choosePath,
              contents,
              suggested,
              choosePath ? null : filePath,
              skipExternalCheck,
            );
            if (!writtenPath) return;
            setFilePath(writtenPath);
            setBrowserFileLabel(null);
            setBaselineJson(contents);
            baselineJsonRef.current = contents;
            clearExternalReloadPrompt();
            lastInvalidDiskHashRef.current = null;
            await clearRecoveryDraft();
          } catch (error) {
            const message = errorMessage(error, "ファイルに保存できませんでした。");
            if (message.includes(DISK_HASH_MISMATCH)) {
              setPendingSaveAs(saveAs);
              setExternalChangeOpen(true);
              holdPause = true;
              return;
            }
            setErrorMessageText(message);
          } finally {
            setFileBusy(false);
          }
          return;
        }

        downloadScheduleJson(suggested, contents);
        setBaselineJson(contents);
        baselineJsonRef.current = contents;
        clearExternalReloadPrompt();
        lastInvalidDiskHashRef.current = null;
        await clearRecoveryDraft();
        if (saveAs) {
          setFilePath(null);
          setBrowserFileLabel(null);
        }
      } finally {
        if (!holdPause) pausePollRef.current = false;
      }
    },
    [clearExternalReloadPrompt, clearRecoveryDraft, currentJson, filePath, title],
  );

  const save = useCallback(
    async (saveAs: boolean) => {
      if (fileBusy) return;
      await performSave(saveAs);
    },
    [fileBusy, performSave],
  );

  const confirmExternalOverwrite = useCallback(() => {
    setExternalChangeOpen(false);
    void performSave(pendingSaveAs, true);
  }, [pendingSaveAs, performSave]);

  const confirmExternalSaveAs = useCallback(() => {
    setExternalChangeOpen(false);
    void performSave(true, true);
  }, [performSave]);

  const cancelExternalChange = useCallback(() => {
    setExternalChangeOpen(false);
    pausePollRef.current = false;
  }, []);

  const confirmExternalReload = useCallback(() => {
    const diskContents = pendingExternalContents ?? deferredExternalContents;
    if (!diskContents) {
      setExternalReloadOpen(false);
      return;
    }
    const parsed = parseScheduleText(diskContents);
    if (!parsed.ok) {
      setErrorMessageText(parsed.message);
      setExternalReloadOpen(false);
      return;
    }
    void applyExternalReload(
      diskContents,
      parsed.canonicalJson,
      parsed.document,
    );
  }, [applyExternalReload, deferredExternalContents, pendingExternalContents]);

  const keepLocalEditsOnExternalReload = useCallback(() => {
    const diskContents = pendingExternalContents;
    if (!diskContents) {
      setExternalReloadOpen(false);
      return;
    }
    setDeferredExternalContents(diskContents);
    setPendingExternalContents(null);
    setExternalReloadOpen(false);
    suppressedDiskRef.current = diskContents;
    void acknowledgeDisk(diskContents).finally(() => {
      if (suppressedDiskRef.current === diskContents) {
        suppressedDiskRef.current = null;
      }
    });
  }, [acknowledgeDisk, pendingExternalContents]);

  const requestDeferredReload = useCallback(() => {
    const diskContents = deferredExternalContents;
    if (!diskContents) return;
    const parsed = parseScheduleText(diskContents);
    if (!parsed.ok) {
      setErrorMessageText(parsed.message);
      return;
    }
    void applyExternalReload(
      diskContents,
      parsed.canonicalJson,
      parsed.document,
    );
  }, [applyExternalReload, deferredExternalContents]);

  const confirmDiscardAndClose = useCallback(() => {
    setClosePromptOpen(false);
    if (!isTauri()) return;
    void (async () => {
      try {
        await clearLastSchedulePathViaTauri();
      } catch (error) {
        setErrorMessageText(
          errorMessage(error, "前回のファイルの記録を削除できませんでした。"),
        );
        return;
      }
      allowCloseRef.current = true;
      void getCurrentWindow().close();
    })();
  }, []);

  const confirmRecoveryOpenDisk = useCallback(() => {
    const payload = recoveryConflictRef.current;
    setRecoveryConflictOpen(false);
    setRecoveryConflictLabel(null);
    setRecoveryConflictMissing(false);
    recoveryConflictRef.current = null;
    if (!payload) return;
    if (payload.missing) {
      beginOpen(scheduleParentDirectory(payload.path) ?? payload.path);
      return;
    }
    if (payload.diskContents == null) return;
    const diskContents = payload.diskContents;
    void (async () => {
      try {
        await clearRecoveryDraft();
        await acceptOpenedScheduleViaTauri(payload.path, diskContents);
        applyOpenedFile({
          path: payload.path,
          contents: diskContents,
        });
      } catch (error) {
        setErrorMessageText(
          errorMessage(error, "ファイルを開けませんでした。"),
        );
      }
    })();
  }, [applyOpenedFile, beginOpen, clearRecoveryDraft]);

  const confirmRecoveryRestoreEdits = useCallback(() => {
    const payload = recoveryConflictRef.current;
    setRecoveryConflictOpen(false);
    setRecoveryConflictLabel(null);
    setRecoveryConflictMissing(false);
    recoveryConflictRef.current = null;
    if (!payload || payload.missing) return;
    if (payload.diskContents == null) return;
    void applyRecoverySession(
      {
        path: payload.path,
        document: payload.document,
        baselineJson: payload.baselineJson,
        diskContents: payload.diskContents,
      },
      { deferDisk: true },
    ).catch((error) => {
      setErrorMessageText(
        errorMessage(error, "未保存の編集を戻せませんでした。"),
      );
    });
  }, [applyRecoverySession]);

  const dismissRecoveryInvalid = useCallback(() => {
    setRecoveryInvalidOpen(false);
  }, []);

  const dismissMissingSchedule = useCallback(() => {
    setMissingScheduleLabel(null);
  }, []);

  const discardRecoveryDraft = useCallback(() => {
    setRecoveryInvalidOpen(false);
    setRecoveryInvalidMessage(null);
    void clearRecoveryDraft().catch((error) => {
      setErrorMessageText(
        errorMessage(error, "復旧用の控えを削除できませんでした。"),
      );
    });
  }, [clearRecoveryDraft]);

  const cancelClose = useCallback(() => {
    setClosePromptOpen(false);
  }, []);

  const dismissError = useCallback(() => setErrorMessageText(null), []);

  return {
    filePath,
    statusLabel,
    showDeferredReload,
    isDirty,
    fileBusy,
    errorMessage: errorMessageText,
    discardPromptOpen,
    closePromptOpen,
    externalChangeOpen,
    externalReloadOpen,
    recoveryConflictOpen,
    recoveryConflictLabel,
    recoveryConflictMissing,
    missingScheduleLabel,
    recoveryInvalidOpen,
    recoveryInvalidMessage,
    confirmRecoveryOpenDisk,
    confirmRecoveryRestoreEdits,
    dismissMissingSchedule,
    dismissRecoveryInvalid,
    discardRecoveryDraft,
    requestOpen,
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
    requestDeferredReload,
    dismissError,
    currentJson,
  };
}
