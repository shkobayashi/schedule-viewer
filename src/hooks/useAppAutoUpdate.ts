import { useEffect, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  readAutoUpdateEnabled,
  shouldIgnoreUpdateCheckError,
} from "../model/autoUpdate";
import {
  acceptApplicationUpdateViaTauri,
  cancelApplicationUpdateViaTauri,
  reportStartupSettledViaTauri,
  requestApplicationUpdateViaTauri,
  clearPendingReleaseNotesViaTauri,
  writePendingReleaseNotesViaTauri,
} from "../model/windowSession";

type UseAppAutoUpdateOptions = {
  startupSettled: boolean;
  startupReportingReady: boolean;
  onUpdateToast: (message: string) => void;
  prepareForApplicationUpdate: () => Promise<boolean>;
  onUpdatePromptCancel: () => void;
};

export function useAppAutoUpdate({
  startupSettled,
  startupReportingReady,
  onUpdateToast,
  prepareForApplicationUpdate,
  onUpdatePromptCancel,
}: UseAppAutoUpdateOptions) {
  const autoUpdateAtStartupRef = useRef(
    isTauri() ? readAutoUpdateEnabled() : false,
  );
  const pendingUpdateRef = useRef<Update | null>(null);
  const checkStartedRef = useRef(false);

  useEffect(() => {
    if (!isTauri() || !startupSettled || !startupReportingReady) return;
    void reportStartupSettledViaTauri(autoUpdateAtStartupRef.current);
  }, [startupSettled, startupReportingReady]);

  useEffect(() => {
    if (!isTauri()) return;
    let unlistenCheck: (() => void) | undefined;
    let cancelled = false;
    void listen("application-run-update-check", () => {
      void (async () => {
        if (checkStartedRef.current) return;
        checkStartedRef.current = true;
        try {
          const update = await check();
          if (cancelled || !update) return;
          pendingUpdateRef.current = update;
          await requestApplicationUpdateViaTauri();
        } catch (error) {
          if (cancelled) return;
          const message =
            error instanceof Error ? error.message : String(error);
          if (shouldIgnoreUpdateCheckError(message)) return;
          onUpdateToast("更新の確認に失敗しました");
        }
      })();
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlistenCheck = fn;
    });
    return () => {
      cancelled = true;
      unlistenCheck?.();
    };
  }, [onUpdateToast]);

  useEffect(() => {
    if (!isTauri()) return;
    let unlistenRequested: (() => void) | undefined;
    let unlistenProceed: (() => void) | undefined;
    let unlistenCancel: (() => void) | undefined;
    let cancelled = false;

    void listen("application-update-requested", () => {
      void (async () => {
        const ready = await prepareForApplicationUpdate();
        if (!ready) {
          await cancelApplicationUpdateViaTauri();
          return;
        }
        await acceptApplicationUpdateViaTauri();
      })();
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlistenRequested = fn;
    });

    void listen("application-update-proceed", () => {
      void (async () => {
        const update = pendingUpdateRef.current;
        if (!update) return;
        try {
          await writePendingReleaseNotesViaTauri(update.version);
        } catch {
          // 印が書けなくても入れ直しは続ける。
        }
        try {
          await update.downloadAndInstall();
        } catch {
          try {
            await clearPendingReleaseNotesViaTauri();
          } catch {
            // 消せなくても、知らせは入れ直しの失敗だけにする。
          }
          pendingUpdateRef.current = null;
          onUpdateToast("更新の入れ直しに失敗しました");
          return;
        }
        pendingUpdateRef.current = null;
        await relaunch();
      })();
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlistenProceed = fn;
    });

    void listen("application-update-cancelled", () => {
      pendingUpdateRef.current = null;
      onUpdatePromptCancel();
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlistenCancel = fn;
    });

    return () => {
      cancelled = true;
      unlistenRequested?.();
      unlistenProceed?.();
      unlistenCancel?.();
    };
  }, [onUpdateToast, prepareForApplicationUpdate, onUpdatePromptCancel]);
}
