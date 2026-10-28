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
import { assessHierarchySave } from "../../model/hierarchyLevelEdit";
import {
  assessFieldValuesConformanceSave,
  assessRequiredFieldValuesSave,
} from "../../model/taskFields";
import type { ScheduleFieldDef } from "../../model/types";
import { withSaveFlight } from "./saveFlight";

export const SCHEDULE_SAVE_ERROR_DIALOG_TITLE = "保存できません";

type UseScheduleSaveOptions = {
  currentJson: string;
  getCanonicalJson?: () => string;
  getDocumentTitle?: () => string;
  title: string;
  filePath: string | null;
  setFilePath: (path: string | null) => void;
  setBrowserFileLabel: (label: string | null) => void;
  setBaselineJson: (json: string) => void;
  baselineJsonRef: { current: string };
  fileBusyRef: { current: boolean };
  setFileBusy: (busy: boolean) => void;
  reportSaveError: (message: string) => void;
  clearRecoveryDraft: () => Promise<void>;
  clearExternalReloadPromptRef: { current: () => void };
  clearInvalidDiskHashRef: { current: () => void };
  extraFieldDefs?: readonly ScheduleFieldDef[];
  onScheduleSavePathChanged?: (
    previousPath: string | null,
    newPath: string,
  ) => void;
};

export function useScheduleSave({
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
  extraFieldDefs = [],
  onScheduleSavePathChanged,
}: UseScheduleSaveOptions) {
  const saveInFlightRef = useRef(false);
  const pausePollRef = useRef(false);
  const [externalChangeOpen, setExternalChangeOpen] = useState(false);
  const [pendingSaveAs, setPendingSaveAs] = useState(false);

  const performSave = useCallback(
    async (saveAs: boolean, skipExternalCheck = false) => {
      await withSaveFlight(saveInFlightRef, fileBusyRef.current, async () => {
        const parsed = parseScheduleText(getCanonicalJson?.() ?? currentJson);
        if (!parsed.ok) {
          reportSaveError(parsed.message);
          if (skipExternalCheck) pausePollRef.current = false;
          return;
        }
        const hierarchyGate = assessHierarchySave(parsed.document);
        if (!hierarchyGate.ok) {
          reportSaveError(hierarchyGate.message);
          if (skipExternalCheck) pausePollRef.current = false;
          return;
        }
        const requiredGate = assessRequiredFieldValuesSave(
          parsed.document,
          extraFieldDefs,
        );
        if (!requiredGate.ok) {
          reportSaveError(requiredGate.message);
          if (skipExternalCheck) pausePollRef.current = false;
          return;
        }
        const conformanceGate = assessFieldValuesConformanceSave(
          parsed.document,
          extraFieldDefs,
        );
        if (!conformanceGate.ok) {
          reportSaveError(conformanceGate.message);
          if (skipExternalCheck) pausePollRef.current = false;
          return;
        }
        const contents = parsed.canonicalJson;
        const suggested = suggestedJsonFilename(
          getDocumentTitle?.() ?? title,
        );
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
                reportSaveError(
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
              const previousPath = filePath;
              setFilePath(writtenPath);
              setBrowserFileLabel(null);
              setBaselineJson(contents);
              baselineJsonRef.current = contents;
              clearExternalReloadPromptRef.current();
              clearInvalidDiskHashRef.current();
              if (previousPath !== writtenPath) {
                onScheduleSavePathChanged?.(previousPath, writtenPath);
              }
              await clearRecoveryDraft();
            } catch (error) {
              const message = errorMessage(error, "ファイルに保存できませんでした。");
              if (message.includes(DISK_HASH_MISMATCH)) {
                setPendingSaveAs(saveAs);
                setExternalChangeOpen(true);
                holdPause = true;
                return;
              }
              reportSaveError(message);
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
      getCanonicalJson,
      getDocumentTitle,
      setBaselineJson,
      setBrowserFileLabel,
      reportSaveError,
      setFileBusy,
      setFilePath,
      title,
      extraFieldDefs,
      onScheduleSavePathChanged,
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
