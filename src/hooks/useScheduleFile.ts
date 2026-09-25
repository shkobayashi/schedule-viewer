import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Category, Milestone, ScheduleDocument } from "../model/types";
import { errorMessage } from "../model/errors";
import {
  downloadScheduleJson,
  isTauri,
  openScheduleViaBrowserInput,
  openScheduleViaTauri,
  parseScheduleText,
  saveScheduleViaTauri,
  scheduleJsonFilename,
  serializeScheduleDocument,
  suggestedJsonFilename,
  checkScheduleFileChangedViaTauri,
} from "../model/scheduleFile";

export type FileStatusTag = "sample" | "saved" | "unsaved";

type UseScheduleFileOptions = {
  title: string;
  categories: Category[];
  milestones: Milestone[];
  replaceDocument: (document: ScheduleDocument) => void;
  onAfterOpen: () => void;
  initialBaselineJson: string;
};

export function useScheduleFile({
  title,
  categories,
  milestones,
  replaceDocument,
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

  const statusTag: FileStatusTag = useMemo(() => {
    if (isDirty) return "unsaved";
    if (filePath) return "saved";
    return "sample";
  }, [filePath, isDirty]);

  const statusLabel = useMemo(() => {
    if (statusTag === "unsaved") return "未保存";
    if (statusTag === "saved") {
      return scheduleJsonFilename(filePath) ?? "保存済み";
    }
    return "サンプルデータ";
  }, [filePath, statusTag]);

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
        return;
      }
      const contents = parsed.canonicalJson;
      const suggested = suggestedJsonFilename(title);

      if (isTauri()) {
        if (!saveAs && !skipExternalCheck && filePath) {
          try {
            const changed = await checkScheduleFileChangedViaTauri();
            if (changed) {
              setPendingSaveAs(saveAs);
              setExternalChangeOpen(true);
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
          const writtenPath = await saveScheduleViaTauri(saveAs, contents, suggested);
          if (!writtenPath) return;
          setFilePath(writtenPath);
          setBaselineJson(contents);
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
      if (saveAs) {
        setFilePath(null);
      }
    },
    [currentJson, filePath, title],
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
  }, []);

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
    isDirty,
    fileBusy,
    errorMessage: errorMessageText,
    discardPromptOpen,
    closePromptOpen,
    externalChangeOpen,
    requestOpen,
    save,
    confirmDiscardAndOpen,
    cancelDiscard,
    confirmDiscardAndClose,
    cancelClose,
    confirmExternalOverwrite,
    confirmExternalSaveAs,
    cancelExternalChange,
    dismissError,
    currentJson,
  };
}
