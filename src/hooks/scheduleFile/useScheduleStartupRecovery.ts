import { useCallback, useEffect, useRef, useState } from "react";
import type { ApplyOpenedFileOptions } from "../useScheduleFile";
import type { ScheduleDocument } from "../../model/types";
import { errorMessage } from "../../model/errors";
import {
  actionIgnoresDraft,
  decideRecoveryStartup,
  parseRecoveryDraft,
} from "../../model/scheduleRecovery";
import {
  acceptOpenedScheduleViaTauri,
  deleteScheduleRecoveryViaTauri,
  isTauri,
  scheduleJsonFilename,
  scheduleParentDirectory,
} from "../../model/scheduleFile";
import {
  readWindowStartupViaTauri,
  takePendingScheduleWindowOpenViaTauri,
} from "../../model/windowSession";
import {
  openWorkspaceFromFile,
  readJsonFileLimitedViaTauri,
  WORKSPACE_STARTUP_FAILED_MESSAGE,
} from "../../model/workspaceLoad";
import type { WorkspaceWindowBinding } from "../../model/workspaceTypes";
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
  setErrorMessageText: (message: string | null) => void;
  startupSettledRef: { current: boolean };
  setStartupSettled: (settled: boolean) => void;
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
  applyOpenedFile: (
    pick: {
      path: string | null;
      displayName?: string | null;
      contents: string;
    },
    options?: ApplyOpenedFileOptions,
  ) => Promise<boolean>;
  restoreFiltersForPath: (
    path: string,
    document: ScheduleDocument,
  ) => Promise<void>;
  onWorkspaceBindingChange?: (binding: WorkspaceWindowBinding | null) => void;
};

export function useScheduleStartupRecovery({
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
  restoreFiltersForPath,
  onWorkspaceBindingChange,
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
  const recoveryStartupRef = useRef(0);

  const applyRecoverySession = useCallback(
    async (
      session: RecoverySession,
      options?: {
        deferDisk?: boolean;
        abortIfMovedOn?: boolean;
        restoreFilters?: boolean;
      },
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
      }).then(async (applied) => {
        if (applied && options?.restoreFilters) {
          await restoreFiltersForPath(session.path, session.document);
        }
        return applied;
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
      restoreFiltersForPath,
    ],
  );

  const applyOpenedFileRef = useRef(applyOpenedFile);
  applyOpenedFileRef.current = applyOpenedFile;
  const onWorkspaceBindingChangeRef = useRef(onWorkspaceBindingChange);
  onWorkspaceBindingChangeRef.current = onWorkspaceBindingChange;

  const restoreWorkspaceBinding = useCallback(
    async (workspacePath: string | null): Promise<boolean> => {
      if (!workspacePath) {
        onWorkspaceBindingChangeRef.current?.(null);
        return true;
      }
      try {
        const text = await readJsonFileLimitedViaTauri(workspacePath, 64 * 1024);
        const opened = await openWorkspaceFromFile(workspacePath, text);
        if (opened.ok) {
          onWorkspaceBindingChangeRef.current?.(opened.binding);
          return true;
        }
        onWorkspaceBindingChangeRef.current?.(null);
        return false;
      } catch {
        onWorkspaceBindingChangeRef.current?.(null);
        return false;
      }
    },
    [],
  );
  const applyRecoverySessionRef = useRef(applyRecoverySession);
  applyRecoverySessionRef.current = applyRecoverySession;

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    const startupId = recoveryStartupRef.current + 1;
    recoveryStartupRef.current = startupId;
    blockDocumentEditsRef.current = true;
    fileBusyRef.current = true;
    startupSettledRef.current = false;
    setStartupSettled(false);
    const releaseStartupBusy = () => {
      if (cancelled || recoveryStartupRef.current !== startupId) return;
      startupSettledRef.current = true;
      setStartupSettled(true);
      blockDocumentEditsRef.current = false;
      fileBusyRef.current = false;
    };
    void (async () => {
      try {
        const pending = await takePendingScheduleWindowOpenViaTauri();
        if (cancelled || recoveryStartupRef.current !== startupId) return;
        if (pending) {
          await applyOpenedFileRef.current(
            {
              path: pending.path,
              contents: pending.contents,
            },
            { recordRecent: true },
          );
          releaseStartupBusy();
          return;
        }
        const startup = await readWindowStartupViaTauri();
        const workspaceStartupOk = await restoreWorkspaceBinding(
          startup.workspacePath,
        );
        if (startup.workspacePath && !workspaceStartupOk) {
          setErrorMessageText(WORKSPACE_STARTUP_FAILED_MESSAGE);
          releaseStartupBusy();
          return;
        }
        const last =
          startup.path != null
            ? {
                path: startup.path,
                contents: startup.contents,
                error: startup.error,
              }
            : null;
        const draftText = startup.draftText;
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
          const path =
            ("path" in action && typeof action.path === "string"
              ? action.path
              : null) ??
            last?.path ??
            (draftText
              ? (() => {
                  const parsed = parseRecoveryDraft(draftText);
                  return parsed.ok ? parsed.draft.path : null;
                })()
              : null);
          if (path) {
            await deleteScheduleRecoveryViaTauri(path);
          }
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
            const applied = await applyRecoverySessionRef.current(
              {
                path: action.path,
                document: action.document,
                baselineJson: action.baselineJson,
                diskContents: action.diskContents,
              },
              { abortIfMovedOn: true, restoreFilters: true },
            );
            if (applied) {
              await clearRecoveryDraft();
            }
            releaseStartupBusy();
            return;
          }
          case "restore":
            await applyRecoverySessionRef.current(
              {
                path: action.path,
                document: action.document,
                baselineJson: action.baselineJson,
                diskContents: action.diskContents,
              },
              { abortIfMovedOn: true, restoreFilters: true },
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
            const applied = await applyRecoverySessionRef.current(
              {
                path: action.path,
                document: action.document,
                baselineJson: action.baselineJson,
                diskContents: action.baselineJson,
              },
              { abortIfMovedOn: true, restoreFilters: true },
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
    // 起動復旧はマウント時に一度だけ走らせる。applyOpenedFile の参照が変わっても再起動しない。
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 起動時のみ
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
        void applyOpenedFile({
          path: payload.path,
          contents: diskContents,
        }, { restoreFilters: true });
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
      { deferDisk: true, restoreFilters: true },
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
