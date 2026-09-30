import { useCallback, useEffect, useRef, useState } from "react";
import type { ScheduleDocument } from "../../model/types";
import { decideExternalReload } from "../../model/scheduleExternalReload";
import {
  acknowledgeScheduleFileContentsViaTauri,
  hashTextSha256,
  isTauri,
  parseScheduleText,
  pollScheduleFileUpdateViaTauri,
} from "../../model/scheduleFile";
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
  setBaselineJson: (json: string) => void;
  setErrorMessageText: (message: string | null) => void;
  baselineJsonRef: { current: string };
  isDirtyRef: { current: boolean };
  hasOpenEditDialogRef: { current: boolean };
  fileBusyRef: { current: boolean };
  pausePollRef: { current: boolean };
  clearRecoveryDraft: () => Promise<void>;
  requestMissingFileOpenRef: { current: () => void };
};

export function useScheduleExternalReload({
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
}: UseScheduleExternalReloadOptions) {
  const [externalReloadOpen, setExternalReloadOpen] = useState(false);
  const [pendingExternalContents, setPendingExternalContents] = useState<
    string | null
  >(null);
  const [deferredExternalContents, setDeferredExternalContents] = useState<
    string | null
  >(null);
  const [reloadNotice, setReloadNotice] = useState(false);
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
    suppressedDiskRef.current = null;
  }, []);

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

  useEffect(() => {
    return () => {
      if (reloadNoticeTimerRef.current != null) {
        window.clearTimeout(reloadNoticeTimerRef.current);
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
    [
      acknowledgeDisk,
      baselineJsonRef,
      clearRecoveryDraft,
      flashReloadNotice,
      isDirtyRef,
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
      setPendingExternalContents(diskContents);
      if (!externalReloadOpenRef.current) {
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
    void applyExternalReload(diskContents, parsed.canonicalJson, parsed.document);
  }, [applyExternalReload, deferredExternalContents, setErrorMessageText]);

  return {
    reloadNotice,
    showDeferredReload: deferredExternalContents != null,
    externalReloadOpen,
    clearExternalReloadPrompt,
    clearInvalidDiskHash,
    resetPollTracking,
    markMissingFilePrompted,
    setDeferredExternalContents,
    confirmExternalReload,
    keepLocalEditsOnExternalReload,
    requestDeferredReload,
  };
}
