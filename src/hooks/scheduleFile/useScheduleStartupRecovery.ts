import { useCallback, useEffect, useRef, useState } from "react";
import type { ScheduleDocument } from "../../model/types";
import { errorMessage } from "../../model/errors";
import {
  actionIgnoresDraft,
  decideRecoveryStartup,
} from "../../model/scheduleRecovery";
import {
  acceptOpenedScheduleViaTauri,
  deleteScheduleRecoveryViaTauri,
  isTauri,
  readLastScheduleFileViaTauri,
  readScheduleRecoveryViaTauri,
  scheduleJsonFilename,
  scheduleParentDirectory,
} from "../../model/scheduleFile";
import { applyAfterAccept } from "./recoveryApply";

type RecoveryConflictPayload = {
  path: string;
  diskContents: string | null;
  document: ScheduleDocument;
  baselineJson: string;
  missing: boolean;
};

type RecoverySession = {
  path: string;
  document: ScheduleDocument;
  baselineJson: string;
  diskContents: string;
};

type UseScheduleStartupRecoveryOptions = {
  replaceDocument: (document: ScheduleDocument) => void;
  onAfterOpen: () => void;
  setFilePath: (path: string | null) => void;
  setBrowserFileLabel: (label: string | null) => void;
  setBaselineJson: (json: string) => void;
  setFileBusy: (busy: boolean) => void;
  setErrorMessageText: (message: string | null) => void;
  filePathRef: { current: string | null };
  baselineJsonRef: { current: string };
  isDirtyRef: { current: boolean };
  fileBusyRef: { current: boolean };
  blockDocumentEditsRef: { current: boolean };
  clearRecoveryDraft: () => Promise<void>;
  clearExternalReloadPrompt: () => void;
  clearInvalidDiskHash: () => void;
  setDeferredExternalContents: (contents: string | null) => void;
  markMissingFilePrompted: () => void;
  beginOpen: (initialDirectory: string | null) => void;
  applyOpenedFile: (pick: {
    path: string | null;
    displayName?: string | null;
    contents: string;
  }) => boolean;
};

export function useScheduleStartupRecovery({
  replaceDocument,
  onAfterOpen,
  setFilePath,
  setBrowserFileLabel,
  setBaselineJson,
  setFileBusy,
  setErrorMessageText,
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
}: UseScheduleStartupRecoveryOptions) {
  const [recoveryConflictOpen, setRecoveryConflictOpen] = useState(false);
  const [recoveryInvalidOpen, setRecoveryInvalidOpen] = useState(false);
  const [recoveryInvalidMessage, setRecoveryInvalidMessage] = useState<
    string | null
  >(null);
  const [recoveryConflictLabel, setRecoveryConflictLabel] = useState<
    string | null
  >(null);
  const [recoveryConflictMissing, setRecoveryConflictMissing] = useState(false);
  const [missingScheduleLabel, setMissingScheduleLabel] = useState<string | null>(
    null,
  );
  const recoveryConflictRef = useRef<RecoveryConflictPayload | null>(null);
  const startupSettledRef = useRef(false);
  const recoveryStartupRef = useRef(0);

  const applyRecoverySession = useCallback(
    async (
      session: RecoverySession,
      options?: { deferDisk?: boolean; abortIfMovedOn?: boolean },
    ): Promise<boolean> => {
      const startupId = recoveryStartupRef.current;
      return applyAfterAccept({
        abortIfMovedOn: options?.abortIfMovedOn ?? false,
        movedOn: () =>
          recoveryStartupRef.current !== startupId ||
          filePathRef.current != null ||
          isDirtyRef.current,
        accept: () => acceptOpenedScheduleViaTauri(session.path, session.diskContents),
        apply: () => {
          replaceDocument(session.document);
          filePathRef.current = session.path;
          setFilePath(session.path);
          setBrowserFileLabel(null);
          setBaselineJson(session.baselineJson);
          baselineJsonRef.current = session.baselineJson;
          clearExternalReloadPrompt();
          clearInvalidDiskHash();
          setDeferredExternalContents(
            options?.deferDisk ? session.diskContents : null,
          );
          onAfterOpen();
          return true;
        },
      });
    },
    [
      baselineJsonRef,
      clearExternalReloadPrompt,
      clearInvalidDiskHash,
      filePathRef,
      isDirtyRef,
      onAfterOpen,
      replaceDocument,
      setBaselineJson,
      setBrowserFileLabel,
      setDeferredExternalContents,
      setFilePath,
    ],
  );

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    const startupId = recoveryStartupRef.current + 1;
    recoveryStartupRef.current = startupId;
    blockDocumentEditsRef.current = true;
    fileBusyRef.current = true;
    setFileBusy(true);
    const releaseStartupBusy = () => {
      if (cancelled || recoveryStartupRef.current !== startupId) return;
      startupSettledRef.current = true;
      blockDocumentEditsRef.current = false;
      fileBusyRef.current = false;
      setFileBusy(false);
    };
    void (async () => {
      try {
        const last = await readLastScheduleFileViaTauri();
        const draftText = await readScheduleRecoveryViaTauri();
        if (cancelled || recoveryStartupRef.current !== startupId) return;
        if (last == null && (draftText == null || draftText.length === 0)) {
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
        const userMovedOn = filePathRef.current != null || isDirtyRef.current;
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
            markMissingFilePrompted();
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
      if (recoveryStartupRef.current === startupId) {
        blockDocumentEditsRef.current = false;
      }
    };
  }, [
    applyRecoverySession,
    blockDocumentEditsRef,
    clearRecoveryDraft,
    fileBusyRef,
    filePathRef,
    isDirtyRef,
    markMissingFilePrompted,
    setErrorMessageText,
    setFileBusy,
  ]);

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
        setErrorMessageText(errorMessage(error, "ファイルを開けませんでした。"));
      }
    })();
  }, [applyOpenedFile, beginOpen, clearRecoveryDraft, setErrorMessageText]);

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
  }, [applyRecoverySession, setErrorMessageText]);

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
  }, [clearRecoveryDraft, setErrorMessageText]);

  return {
    startupSettledRef,
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
  };
}
