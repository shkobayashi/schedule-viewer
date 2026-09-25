import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Category, Milestone, ScheduleDocument } from "../model/types";
import { errorMessage } from "../model/errors";
import { decideExternalReload } from "../model/scheduleExternalReload";
import {
  acknowledgeScheduleFileContentsViaTauri,
  downloadScheduleJson,
  isTauri,
  openScheduleViaBrowserInput,
  openScheduleViaTauri,
  parseScheduleText,
  pollScheduleFileUpdateViaTauri,
  saveScheduleViaTauri,
  scheduleJsonFilename,
  serializeScheduleDocument,
  suggestedJsonFilename,
  checkScheduleFileChangedViaTauri,
} from "../model/scheduleFile";

export type FileStatusTag = "sample" | "saved" | "unsaved";

const EXTERNAL_RELOAD_POLL_MS = 1500;
const RELOAD_NOTICE_MS = 4000;

type UseScheduleFileOptions = {
  title: string;
  categories: Category[];
  milestones: Milestone[];
  replaceDocument: (document: ScheduleDocument) => void;
  reloadDocumentFromDisk: (document: ScheduleDocument) => void;
  onAfterOpen: () => void;
  initialBaselineJson: string;
};

export function useScheduleFile({
  title,
  categories,
  milestones,
  replaceDocument,
  reloadDocumentFromDisk,
  onAfterOpen,
  initialBaselineJson,
}: UseScheduleFileOptions) {
  const [filePath, setFilePath] = useState<string | null>(null);
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

  const currentJson = useMemo(
    () => serializeScheduleDocument(title, categories, milestones),
    [categories, milestones, title],
  );

  const isDirty = currentJson !== baselineJson;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const allowCloseRef = useRef(false);
  const baselineJsonRef = useRef(baselineJson);
  baselineJsonRef.current = baselineJson;
  const lastInvalidDiskContentsRef = useRef<string | null>(null);
  const externalReloadOpenRef = useRef(externalReloadOpen);
  externalReloadOpenRef.current = externalReloadOpen;
  const fileBusyRef = useRef(fileBusy);
  fileBusyRef.current = fileBusy;
  const pausePollRef = useRef(false);
  const reloadNoticeTimerRef = useRef<number | null>(null);
  const suppressedDiskRef = useRef<string | null>(null);

  const statusTag: FileStatusTag = useMemo(() => {
    if (isDirty) return "unsaved";
    if (filePath) return "saved";
    return "sample";
  }, [filePath, isDirty]);

  const statusLabel = useMemo(() => {
    if (reloadNotice) return "ファイルを反映しました";
    if (statusTag === "unsaved") return "未保存";
    if (statusTag === "saved") {
      return scheduleJsonFilename(filePath) ?? "保存済み";
    }
    return "サンプルデータ";
  }, [filePath, reloadNotice, statusTag]);

  const showDeferredReload = deferredExternalContents != null;

  const clearExternalReloadPrompt = useCallback(() => {
    setPendingExternalContents(null);
    setDeferredExternalContents(null);
    setExternalReloadOpen(false);
    suppressedDiskRef.current = null;
  }, []);

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
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void getCurrentWindow()
      .onCloseRequested((event) => {
        if (allowCloseRef.current || !isDirtyRef.current) return;
        event.preventDefault();
        setClosePromptOpen(true);
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
      lastInvalidDiskContentsRef.current = null;
      suppressedDiskRef.current = null;
      baselineJsonRef.current = canonicalJson;
      isDirtyRef.current = false;
      flashReloadNotice();
      await acknowledgeDisk(diskContents);
    },
    [acknowledgeDisk, flashReloadNotice, reloadDocumentFromDisk],
  );

  const processDiskContents = useCallback(
    async (diskContents: string) => {
      if (diskContents === suppressedDiskRef.current) return;
      const decision = decideExternalReload(
        diskContents,
        baselineJsonRef.current,
        isDirtyRef.current,
      );

      if (pausePollRef.current || fileBusyRef.current) return;

      if (decision.kind === "invalid") {
        setPendingExternalContents(null);
        setExternalReloadOpen(false);
        if (lastInvalidDiskContentsRef.current !== decision.diskContents) {
          lastInvalidDiskContentsRef.current = decision.diskContents;
          setErrorMessageText(decision.message);
        }
        return;
      }

      lastInvalidDiskContentsRef.current = null;

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
        if (
          cancelled ||
          fileBusyRef.current ||
          pausePollRef.current ||
          !update
        ) {
          return;
        }
        await processDiskContents(update.contents);
      } catch {
        // 書き込み途中などは次の間隔で再試行する
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
    (pick: { path: string | null; contents: string }) => {
      const parsed = parseScheduleText(pick.contents);
      if (!parsed.ok) {
        setErrorMessageText(parsed.message);
        return;
      }
      replaceDocument(parsed.document);
      setFilePath(pick.path);
      setBaselineJson(parsed.canonicalJson);
      setDeferredExternalContents(null);
      setPendingExternalContents(null);
      setExternalReloadOpen(false);
      lastInvalidDiskContentsRef.current = null;
      suppressedDiskRef.current = null;
      baselineJsonRef.current = parsed.canonicalJson;
      onAfterOpen();
    },
    [onAfterOpen, replaceDocument],
  );

  const runOpen = useCallback(async () => {
    if (fileBusy) return;
    setFileBusy(true);
    try {
      const pick = isTauri()
        ? await openScheduleViaTauri()
        : await openScheduleViaBrowserInput();
      if (!pick) return;
      applyOpenedFile(pick);
    } catch (error) {
      setErrorMessageText(
        errorMessage(error, "ファイルを開けませんでした。"),
      );
    } finally {
      setFileBusy(false);
    }
  }, [applyOpenedFile, fileBusy]);

  const requestOpen = useCallback(() => {
    if (fileBusy) return;
    if (isDirty) {
      setPendingOpen(true);
      setDiscardPromptOpen(true);
      return;
    }
    void runOpen();
  }, [fileBusy, isDirty, runOpen]);

  const confirmDiscardAndOpen = useCallback(() => {
    setDiscardPromptOpen(false);
    if (!pendingOpen) return;
    setPendingOpen(false);
    void runOpen();
  }, [pendingOpen, runOpen]);

  const cancelDiscard = useCallback(() => {
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
          if (!saveAs && !skipExternalCheck && filePath) {
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
              saveAs,
              contents,
              suggested,
            );
            if (!writtenPath) return;
            setFilePath(writtenPath);
            setBaselineJson(contents);
            baselineJsonRef.current = contents;
            clearExternalReloadPrompt();
            lastInvalidDiskContentsRef.current = null;
          } catch (error) {
            setErrorMessageText(
              errorMessage(error, "ファイルに保存できませんでした。"),
            );
          } finally {
            setFileBusy(false);
          }
          return;
        }

        downloadScheduleJson(suggested, contents);
        setBaselineJson(contents);
        baselineJsonRef.current = contents;
        clearExternalReloadPrompt();
        lastInvalidDiskContentsRef.current = null;
        if (saveAs) {
          setFilePath(null);
        }
      } finally {
        if (!holdPause) pausePollRef.current = false;
      }
    },
    [clearExternalReloadPrompt, currentJson, filePath, title],
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
    if (isTauri()) {
      allowCloseRef.current = true;
      void getCurrentWindow().close();
    }
  }, []);

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
