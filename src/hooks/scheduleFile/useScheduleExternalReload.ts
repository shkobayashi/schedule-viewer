import { useCallback, useEffect, useRef, useState } from "react";
import {
  createBaselineMergeDeferredTracking,
  shouldClearExternalReloadBanner,
  shouldRestoreExternalReloadBanner,
  type BaselineMergeDeferredTracking,
} from "../../model/baselineMergeDeferred";
import type { DocumentSnapshot } from "../../model/history";
import type { ScheduleDocument } from "../../model/types";
import type { BaselineMergeAssessment } from "../../model/baselineMerge";
import { assessBaselineMerge } from "../../model/baselineMerge";
import {
  buildBaselineMergeReview,
  type BaselineMergeReviewView,
} from "../../model/baselineMergeReview";
import { decideExternalReload } from "../../model/scheduleExternalReload";
import {
  acknowledgeScheduleFileContentsViaTauri,
  hashTextSha256,
  isTauri,
  parseScheduleText,
  type ParseScheduleResult,
  pollScheduleFileUpdateViaTauri,
} from "../../model/scheduleFile";

function parseScheduleErrorMessage(
  baselineParsed: ParseScheduleResult,
  screenParsed: ParseScheduleResult,
  fileParsed: ParseScheduleResult,
): string {
  if (!fileParsed.ok) return fileParsed.message;
  if (!screenParsed.ok) return screenParsed.message;
  if (!baselineParsed.ok) return baselineParsed.message;
  return "スケジュールを読み込めません。";
}
import { EXTERNAL_RELOAD_POLL_MS, RELOAD_NOTICE_MS } from "./constants";
import {
  recordPollReadFailure,
  shouldDropExternalReload,
  shouldIgnorePolledContents,
  shouldSkipPollTick,
} from "./pollGate";

type UseScheduleExternalReloadOptions = {
  filePath: string | null;
  reloadDocumentFromDisk: (document: ScheduleDocument) => void;
  applyMergedDocument: (
    document: ScheduleDocument,
  ) => { before: DocumentSnapshot; after: DocumentSnapshot } | null;
  setBaselineJson: (json: string) => void;
  setErrorMessageText: (message: string | null) => void;
  baselineJson: string;
  currentJson: string;
  baselineJsonRef: { current: string };
  isDirtyRef: { current: boolean };
  hasOpenEditDialogRef: { current: boolean };
  fileBusyRef: { current: boolean };
  pausePollRef: { current: boolean };
  clearRecoveryDraft: () => Promise<void>;
  requestMissingFileOpenRef: { current: () => void };
  notifyPeersRef?: { current: (status: "applied" | "pending" | "cleared") => void };
};

export function useScheduleExternalReload({
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
}: UseScheduleExternalReloadOptions) {
  const [externalReloadOpen, setExternalReloadOpen] = useState(false);
  const [pendingExternalContents, setPendingExternalContents] = useState<
    string | null
  >(null);
  const [deferredExternalContents, setDeferredExternalContents] = useState<
    string | null
  >(null);
  const [reloadNotice, setReloadNotice] = useState(false);
  const [mergeNotice, setMergeNotice] = useState(false);
  const [diskUpdatedAgain, setDiskUpdatedAgain] = useState(false);
  const mergeDeferredTrackingRef = useRef<BaselineMergeDeferredTracking | null>(
    null,
  );
  const mergeNoticeTimerRef = useRef<number | null>(null);
  const externalReloadOpenRef = useRef(externalReloadOpen);
  externalReloadOpenRef.current = externalReloadOpen;
  const lastInvalidDiskHashRef = useRef<string | null>(null);
  const pollReadFailuresRef = useRef(0);
  const missingFilePromptedRef = useRef(false);
  const suppressedDiskRef = useRef<string | null>(null);
  const reloadNoticeTimerRef = useRef<number | null>(null);

  const clearExternalReloadPrompt = useCallback(() => {
    setPendingExternalContents(null);
    setDeferredExternalContents(null);
    setExternalReloadOpen(false);
    setDiskUpdatedAgain(false);
    suppressedDiskRef.current = null;
    mergeDeferredTrackingRef.current = null;
  }, []);

  useEffect(() => {
    mergeDeferredTrackingRef.current = null;
  }, [baselineJson]);

  const clearInvalidDiskHash = useCallback(() => {
    lastInvalidDiskHashRef.current = null;
  }, []);

  const resetPollTracking = useCallback(() => {
    lastInvalidDiskHashRef.current = null;
    pollReadFailuresRef.current = 0;
    missingFilePromptedRef.current = false;
  }, []);

  const markMissingFilePrompted = useCallback(() => {
    missingFilePromptedRef.current = true;
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

  const flashMergeNotice = useCallback(() => {
    if (mergeNoticeTimerRef.current != null) {
      window.clearTimeout(mergeNoticeTimerRef.current);
    }
    setMergeNotice(true);
    mergeNoticeTimerRef.current = window.setTimeout(() => {
      setMergeNotice(false);
      mergeNoticeTimerRef.current = null;
    }, RELOAD_NOTICE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (reloadNoticeTimerRef.current != null) {
        window.clearTimeout(reloadNoticeTimerRef.current);
      }
      if (mergeNoticeTimerRef.current != null) {
        window.clearTimeout(mergeNoticeTimerRef.current);
      }
    };
  }, []);

  const acknowledgeDisk = useCallback(async (diskContents: string) => {
    if (!isTauri()) return;
    await acknowledgeScheduleFileContentsViaTauri(diskContents);
  }, []);

  const applyExternalReload = useCallback(
    async (
      diskContents: string,
      canonicalJson: string,
      document: ScheduleDocument,
    ) => {
      mergeDeferredTrackingRef.current = null;
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
      notifyPeersRef?.current("applied");
      await acknowledgeDisk(diskContents);
      await clearRecoveryDraft();
    },
    [
      acknowledgeDisk,
      baselineJsonRef,
      clearRecoveryDraft,
      flashReloadNotice,
      isDirtyRef,
      notifyPeersRef,
      reloadDocumentFromDisk,
      setBaselineJson,
    ],
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

      if (
        shouldDropExternalReload({
          fileBusy: fileBusyRef.current,
          pausePoll: pausePollRef.current,
        })
      ) {
        return;
      }

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
          shouldDropExternalReload({
            fileBusy: fileBusyRef.current,
            pausePoll: pausePollRef.current,
          }) ||
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
      if (externalReloadOpenRef.current) {
        setDiskUpdatedAgain(true);
      }
      setPendingExternalContents(diskContents);
      if (!externalReloadOpenRef.current) {
        notifyPeersRef?.current("pending");
        setExternalReloadOpen(true);
      }
    },
    [
      acknowledgeDisk,
      applyExternalReload,
      baselineJsonRef,
      clearExternalReloadPrompt,
      fileBusyRef,
      hasOpenEditDialogRef,
      isDirtyRef,
      notifyPeersRef,
      pausePollRef,
      setErrorMessageText,
    ],
  );

  useEffect(() => {
    if (!isTauri() || !filePath) return;
    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (
        shouldSkipPollTick({
          cancelled,
          inFlight,
          fileBusy: fileBusyRef.current,
          pausePoll: pausePollRef.current,
        })
      ) {
        return;
      }
      inFlight = true;
      try {
        const update = await pollScheduleFileUpdateViaTauri();
        if (
          shouldIgnorePolledContents({
            cancelled,
            fileBusy: fileBusyRef.current,
            pausePoll: pausePollRef.current,
          })
        ) {
          return;
        }
        pollReadFailuresRef.current = 0;
        missingFilePromptedRef.current = false;
        if (!update) return;
        await processDiskContents(update.contents);
      } catch {
        const next = recordPollReadFailure({
          failures: pollReadFailuresRef.current,
          missingPrompted: missingFilePromptedRef.current,
          fileBusy: fileBusyRef.current,
          pausePoll: pausePollRef.current,
        });
        pollReadFailuresRef.current = next.failures;
        if (next.promptMissing) {
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
  }, [fileBusyRef, filePath, pausePollRef, processDiskContents, requestMissingFileOpenRef]);

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
    void applyExternalReload(diskContents, parsed.canonicalJson, parsed.document);
  }, [
    applyExternalReload,
    deferredExternalContents,
    pendingExternalContents,
    setErrorMessageText,
  ]);

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
    notifyPeersRef?.current("cleared");
    void acknowledgeDisk(diskContents).finally(() => {
      if (suppressedDiskRef.current === diskContents) {
        suppressedDiskRef.current = null;
      }
    });
  }, [acknowledgeDisk, notifyPeersRef, pendingExternalContents]);

  const requestDeferredConfirm = useCallback(() => {
    const diskContents = deferredExternalContents;
    if (!diskContents) return;
    setPendingExternalContents(diskContents);
    setDiskUpdatedAgain(false);
    notifyPeersRef?.current("pending");
    setExternalReloadOpen(true);
  }, [deferredExternalContents, notifyPeersRef]);

  const applyBaselineMerge = useCallback(
    (document: ScheduleDocument, diskContents: string) => {
      const merged = applyMergedDocument(document);
      if (!merged) return;
      isDirtyRef.current = true;
      mergeDeferredTrackingRef.current = createBaselineMergeDeferredTracking(
        merged.before,
        merged.after,
        diskContents,
      );
      setDeferredExternalContents(null);
      setPendingExternalContents(null);
      setExternalReloadOpen(false);
      setDiskUpdatedAgain(false);
      lastInvalidDiskHashRef.current = null;
      suppressedDiskRef.current = null;
      flashMergeNotice();
      notifyPeersRef?.current("cleared");
      void acknowledgeDisk(diskContents);
    },
    [
      acknowledgeDisk,
      applyMergedDocument,
      flashMergeNotice,
      isDirtyRef,
      notifyPeersRef,
    ],
  );

  const confirmBaselineMerge = useCallback(() => {
    const diskContents = pendingExternalContents ?? deferredExternalContents;
    if (!diskContents) return;
    const baselineParsed = parseScheduleText(baselineJson);
    const screenParsed = parseScheduleText(currentJson);
    const fileParsed = parseScheduleText(diskContents);
    if (!baselineParsed.ok || !screenParsed.ok || !fileParsed.ok) {
      setErrorMessageText(
        parseScheduleErrorMessage(baselineParsed, screenParsed, fileParsed),
      );
      return;
    }
    const assessment = assessBaselineMerge(
      baselineParsed.document,
      screenParsed.document,
      fileParsed.document,
    );
    if (assessment.kind !== "mergeable") return;
    applyBaselineMerge(assessment.document, diskContents);
  }, [
    applyBaselineMerge,
    baselineJson,
    currentJson,
    deferredExternalContents,
    pendingExternalContents,
    setErrorMessageText,
  ]);

  const getExternalReloadDocuments = useCallback(() => {
    const diskContents = pendingExternalContents ?? deferredExternalContents;
    if (!diskContents) return null;
    const baselineParsed = parseScheduleText(baselineJson);
    const screenParsed = parseScheduleText(currentJson);
    const fileParsed = parseScheduleText(diskContents);
    if (!baselineParsed.ok || !screenParsed.ok || !fileParsed.ok) {
      return {
        ok: false as const,
        baselineParsed,
        screenParsed,
        fileParsed,
      };
    }
    return {
      ok: true as const,
      baseline: baselineParsed.document,
      screen: screenParsed.document,
      file: fileParsed.document,
    };
  }, [baselineJson, currentJson, deferredExternalContents, pendingExternalContents]);

  const buildExternalReloadAssessment = useCallback((): BaselineMergeAssessment | null => {
    const parsed = getExternalReloadDocuments();
    if (!parsed) return null;
    if (!parsed.ok) {
      return {
        kind: "blocked",
        lines: [],
        counts: {
          screenOnly: 0,
          fileOnly: 0,
          same: 0,
          conflicts: 0,
        },
        conflictLines: [],
        nonConflictCount: 0,
        validationMessage: parseScheduleErrorMessage(
          parsed.baselineParsed,
          parsed.screenParsed,
          parsed.fileParsed,
        ),
      };
    }
    return assessBaselineMerge(parsed.baseline, parsed.screen, parsed.file);
  }, [getExternalReloadDocuments]);

  const buildExternalReloadReview = useCallback((): BaselineMergeReviewView | null => {
    const assessment = buildExternalReloadAssessment();
    const parsed = getExternalReloadDocuments();
    if (!assessment || assessment.kind !== "mergeable" || !parsed?.ok) {
      return null;
    }
    return buildBaselineMergeReview(
      parsed.baseline,
      parsed.screen,
      parsed.file,
      assessment.lines,
    );
  }, [buildExternalReloadAssessment, getExternalReloadDocuments]);

  const onHistoryUndoApplied = useCallback(
    (landed: DocumentSnapshot) => {
      const tracking = mergeDeferredTrackingRef.current;
      if (!shouldRestoreExternalReloadBanner(tracking, landed)) return;
      const disk = tracking!.diskContents;
      setDeferredExternalContents(disk);
      suppressedDiskRef.current = disk;
      void acknowledgeDisk(disk).finally(() => {
        if (suppressedDiskRef.current === disk) {
          suppressedDiskRef.current = null;
        }
      });
    },
    [acknowledgeDisk],
  );

  const onHistoryRedoApplied = useCallback((landed: DocumentSnapshot) => {
    if (!shouldClearExternalReloadBanner(mergeDeferredTrackingRef.current, landed)) {
      return;
    }
    setDeferredExternalContents(null);
  }, []);

  return {
    reloadNotice,
    mergeNotice,
    diskUpdatedAgain,
    showDeferredReload: deferredExternalContents != null,
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
  };
}
