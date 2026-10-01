import { useCallback, useRef, useState } from "react";
import { errorMessage } from "../../model/errors";
import {
  DISK_HASH_MISMATCH,
  checkScheduleFileChangedViaTauri,
  downloadScheduleJson,
  isTauri,
  parseScheduleText,
  saveScheduleViaTauri,
  suggestedJsonFilename,
} from "../../model/scheduleFile";
import { withSaveFlight } from "./saveFlight";

type UseScheduleSaveOptions = {
  currentJson: string;
  title: string;
  filePath: string | null;
  setFilePath: (path: string | null) => void;
  setBrowserFileLabel: (label: string | null) => void;
  setBaselineJson: (json: string) => void;
  baselineJsonRef: { current: string };
  fileBusyRef: { current: boolean };
  setFileBusy: (busy: boolean) => void;
  setErrorMessageText: (message: string | null) => void;
  clearRecoveryDraft: () => Promise<void>;
  clearExternalReloadPromptRef: { current: () => void };
  clearInvalidDiskHashRef: { current: () => void };
};

export function useScheduleSave({
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
}: UseScheduleSaveOptions) {
  const saveInFlightRef = useRef(false);
  const pausePollRef = useRef(false);
  const [externalChangeOpen, setExternalChangeOpen] = useState(false);
  const [pendingSaveAs, setPendingSaveAs] = useState(false);

  const performSave = useCallback(
    async (saveAs: boolean, skipExternalCheck = false) => {
      await withSaveFlight(saveInFlightRef, fileBusyRef.current, async () => {
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
              clearExternalReloadPromptRef.current();
              clearInvalidDiskHashRef.current();
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
          clearExternalReloadPromptRef.current();
          clearInvalidDiskHashRef.current();
          await clearRecoveryDraft();
          if (saveAs) {
            setFilePath(null);
            setBrowserFileLabel(null);
          }
        } finally {
          if (!holdPause) pausePollRef.current = false;
        }
      });
    },
    [
      baselineJsonRef,
      clearExternalReloadPromptRef,
      clearInvalidDiskHashRef,
      clearRecoveryDraft,
      currentJson,
      fileBusyRef,
      filePath,
      setBaselineJson,
      setBrowserFileLabel,
      setErrorMessageText,
      setFileBusy,
      setFilePath,
      title,
    ],
  );

  const save = useCallback(
    async (saveAs: boolean) => {
      await performSave(saveAs);
    },
    [performSave],
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

  return {
    pausePollRef,
    save,
    externalChangeOpen,
    confirmExternalOverwrite,
    confirmExternalSaveAs,
    cancelExternalChange,
  };
}
