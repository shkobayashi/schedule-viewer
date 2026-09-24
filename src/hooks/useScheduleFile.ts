import { useCallback, useMemo, useState } from "react";
import type { Category, Milestone, ScheduleDocument } from "../model/types";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);

  const currentJson = useMemo(
    () => serializeScheduleDocument(title, categories, milestones),
    [categories, milestones, title],
  );

  const isDirty = currentJson !== baselineJson;

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

  const applyOpenedFile = useCallback(
    (pick: { path: string | null; contents: string }) => {
      const parsed = parseScheduleText(pick.contents);
      if (!parsed.ok) {
        setErrorMessage(parsed.message);
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
    try {
      const pick = isTauri()
        ? await openScheduleViaTauri()
        : await openScheduleViaBrowserInput();
      if (!pick) return;
      applyOpenedFile(pick);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "ファイルを開けませんでした。",
      );
    }
  }, [applyOpenedFile]);

  const requestOpen = useCallback(() => {
    if (isDirty) {
      setPendingOpen(true);
      setDiscardPromptOpen(true);
      return;
    }
    void runOpen();
  }, [isDirty, runOpen]);

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

  const save = useCallback(
    async (saveAs: boolean) => {
      const parsed = parseScheduleText(currentJson);
      if (!parsed.ok) {
        setErrorMessage(parsed.message);
        return;
      }
      const contents = parsed.canonicalJson;
      const suggested = suggestedJsonFilename(title);

      if (isTauri()) {
        try {
          const pathForSave = saveAs ? null : filePath;
          const writtenPath = await saveScheduleViaTauri(
            pathForSave,
            contents,
            suggested,
          );
          if (!writtenPath) return;
          setFilePath(writtenPath);
          setBaselineJson(contents);
        } catch (error) {
          setErrorMessage(
            error instanceof Error ? error.message : "ファイルに保存できませんでした。",
          );
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

  const dismissError = useCallback(() => setErrorMessage(null), []);

  return {
    filePath,
    statusLabel,
    isDirty,
    errorMessage,
    discardPromptOpen,
    requestOpen,
    save,
    confirmDiscardAndOpen,
    cancelDiscard,
    dismissError,
  };
}
