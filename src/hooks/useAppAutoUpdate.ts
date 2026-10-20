import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  type ApplicationUpdateUiState,
  IDLE_UPDATE_UI_STATE,
  canStartUpdateCheck,
  formatOfferVersionLabel,
  isUpdateOfferActive,
  updateInstallingMessage,
  updateOfferMessage,
} from "../model/appUpdateUi";
import {
  classifyUpdateCheckError,
  manualUpdateCheckInfoMessage,
  readAutoUpdateEnabled,
  shouldAcceptAutoUpdate,
} from "../model/autoUpdate";
import { normalizeVersionLabel } from "../model/releaseNotes";
import {
  acceptApplicationUpdateViaTauri,
  beginApplicationUpdateInstallViaTauri,
  cancelApplicationUpdateViaTauri,
  type ApplicationUpdateUiBroadcast,
  isAnyScheduleWindowFocusedViaTauri,
  listOpenWindowLabelsViaTauri,
  readFocusedWindowLabelViaTauri,
  reportStartupSettledViaTauri,
  requestApplicationUpdateViaTauri,
  showApplicationUpdateBackgroundNotificationViaTauri,
  syncApplicationUpdateUiViaTauri,
} from "../model/windowSession";

function isMacDesktop(): boolean {
  if (!isTauri()) return false;
  const platform = navigator.platform || navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

function broadcastFromState(state: ApplicationUpdateUiState): void {
  if (!isTauri()) return;
  const payload: ApplicationUpdateUiBroadcast = {
    phase: state.phase,
    version: state.version,
    message: state.message,
    infoEphemeral: state.infoEphemeral,
    checkLabel: state.checkLabel,
  };
  void syncApplicationUpdateUiViaTauri(payload);
}

function parseBroadcast(
  payload: ApplicationUpdateUiBroadcast,
): ApplicationUpdateUiState {
  const phase = payload.phase as ApplicationUpdateUiState["phase"];
  return {
    phase,
    version: payload.version,
    message: payload.message,
    infoEphemeral: payload.infoEphemeral,
    checkLabel: payload.checkLabel,
  };
}

type UseAppUpdateFlowOptions = {
  startupSettled: boolean;
  settingsOpen: boolean;
  settingsSection: string;
  storeDistribution: boolean;
  onCloseSettings: () => void;
  onUpdateToast: (message: string) => void;
  prepareForApplicationUpdate: () => Promise<boolean>;
  onUpdatePromptCancel: () => void;
  onWindowFocused?: () => void;
};

export function useAppUpdateFlow({
  startupSettled,
  settingsOpen,
  settingsSection,
  storeDistribution,
  onCloseSettings,
  onUpdateToast,
  prepareForApplicationUpdate,
  onUpdatePromptCancel,
}: UseAppUpdateFlowOptions) {
  const selfLabelRef = useRef(isTauri() ? getCurrentWindow().label : "main");
  const [uiState, setUiState] =
    useState<ApplicationUpdateUiState>(IDLE_UPDATE_UI_STATE);
  const [focusedLabel, setFocusedLabel] = useState("main");
  const uiStateRef = useRef(uiState);
  uiStateRef.current = uiState;

  const autoUpdateAtStartupRef = useRef(
    isTauri() ? readAutoUpdateEnabled() : false,
  );
  const pendingUpdateRef = useRef<Update | null>(null);
  const startupCheckStartedRef = useRef(false);
  const osNotifiedRef = useRef(false);
  const checkInFlightRef = useRef(false);
  const installedVersionRef = useRef<string | null>(null);
  const offerLiveTokenRef = useRef(0);
  const announcedOfferKeysRef = useRef(new Set<string>());

  const setUiStateSynced = useCallback((next: ApplicationUpdateUiState) => {
    setUiState(next);
    broadcastFromState(next);
  }, []);

  const refreshFocusedLabel = useCallback(async () => {
    if (!isTauri()) return;
    try {
      const label = await readFocusedWindowLabelViaTauri();
      setFocusedLabel(label);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    void getVersion()
      .then((version) => {
        installedVersionRef.current =
          normalizeVersionLabel(version) ?? version.replace(/^[vV]/, "");
      })
      .catch(() => {
        installedVersionRef.current = null;
      });
  }, []);

  useEffect(() => {
    if (!isTauri() || !startupSettled) return;
    void reportStartupSettledViaTauri(autoUpdateAtStartupRef.current);
  }, [startupSettled]);

  useEffect(() => {
    if (!isTauri()) return;
    void refreshFocusedLabel();
    const onFocus = () => {
      void refreshFocusedLabel();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshFocusedLabel]);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    void listen<ApplicationUpdateUiBroadcast>(
      "application-update-ui-sync",
      (event) => {
        setUiState(parseBroadcast(event.payload));
      },
    ).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const maybeShowBackgroundNotification = useCallback(
    async (body: string) => {
      if (!isTauri() || osNotifiedRef.current) return;
      const focused = await isAnyScheduleWindowFocusedViaTauri();
      if (focused) return;
      osNotifiedRef.current = true;
      await showApplicationUpdateBackgroundNotificationViaTauri(body);
    },
    [],
  );

  const abortUpdateInstall = useCallback(async () => {
    const update = pendingUpdateRef.current;
    pendingUpdateRef.current = null;
    if (update) await update.close();
    await cancelApplicationUpdateViaTauri();
    setUiStateSynced(IDLE_UPDATE_UI_STATE);
  }, [setUiStateSynced]);

  const versionsMatchOffer = useCallback(
    (offeredVersion: string, remoteVersion: string) => {
      return (
        formatOfferVersionLabel(offeredVersion) ===
        formatOfferVersionLabel(remoteVersion)
      );
    },
    [],
  );

  const runCheck = useCallback(
    async (manual: boolean, inSettings = false) => {
      if (!isTauri() || storeDistribution || checkInFlightRef.current) return;
      const current = uiStateRef.current;
      if (!manual && startupCheckStartedRef.current) return;
      if (manual && !canStartUpdateCheck(current)) {
        return;
      }
      if (!manual) startupCheckStartedRef.current = true;

      checkInFlightRef.current = true;
      osNotifiedRef.current = false;
      if (manual) {
        setUiStateSynced({
          phase: "checking",
          checkLabel: selfLabelRef.current,
        });
      }

      try {
        const update = await check();
        if (!update) {
          checkInFlightRef.current = false;
          if (manual) {
            setUiStateSynced({
              phase: "info",
              message: "この版が最新です",
              infoEphemeral: !inSettings,
            });
            if (!inSettings) {
              window.setTimeout(() => {
                if (uiStateRef.current.message === "この版が最新です") {
                  setUiStateSynced(IDLE_UPDATE_UI_STATE);
                }
              }, 4000);
            }
          } else {
            setUiStateSynced(IDLE_UPDATE_UI_STATE);
          }
          return;
        }
        if (
          !shouldAcceptAutoUpdate(update.currentVersion, update.version)
        ) {
          await update.close();
          checkInFlightRef.current = false;
          if (manual) {
            setUiStateSynced({
              phase: "info",
              message: "この版が最新です",
              infoEphemeral: !inSettings,
            });
            if (!inSettings) {
              window.setTimeout(() => {
                if (uiStateRef.current.message === "この版が最新です") {
                  setUiStateSynced(IDLE_UPDATE_UI_STATE);
                }
              }, 4000);
            }
          } else {
            setUiStateSynced(IDLE_UPDATE_UI_STATE);
          }
          return;
        }
        pendingUpdateRef.current = update;
        const message = updateOfferMessage(update.version);
        offerLiveTokenRef.current += 1;
        setUiStateSynced({
          phase: "offer",
          version: update.version,
          message,
          checkLabel: selfLabelRef.current,
        });
        await maybeShowBackgroundNotification(message);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        checkInFlightRef.current = false;
        if (!manual) {
          const kind = classifyUpdateCheckError(errorMessage, isMacDesktop());
          if (kind === "ignore" || kind === "unsupported_mac") {
            setUiStateSynced(IDLE_UPDATE_UI_STATE);
            return;
          }
          onUpdateToast("更新の確認に失敗しました");
          setUiStateSynced(IDLE_UPDATE_UI_STATE);
          return;
        }
        const failMessage = manualUpdateCheckInfoMessage(
          errorMessage,
          isMacDesktop(),
        );
        setUiStateSynced({
          phase: "info",
          message: failMessage,
          infoEphemeral: !inSettings,
        });
        if (!inSettings) {
          window.setTimeout(() => {
            if (uiStateRef.current.message === failMessage) {
              setUiStateSynced(IDLE_UPDATE_UI_STATE);
            }
          }, 4000);
        }
      } finally {
        checkInFlightRef.current = false;
      }
    },
    [
      maybeShowBackgroundNotification,
      onUpdateToast,
      setUiStateSynced,
      storeDistribution,
    ],
  );

  const requestManualUpdateCheck = useCallback(
    (inSettings = false) => {
      void runCheck(true, inSettings);
    },
    [runCheck],
  );

  useEffect(() => {
    if (!isTauri()) return;
    let unlistenCheck: (() => void) | undefined;
    let cancelled = false;
    void listen("application-run-update-check", () => {
      void runCheck(false);
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
  }, [runCheck]);

  const dismissUpdateInfo = useCallback(() => {
    setUiStateSynced(IDLE_UPDATE_UI_STATE);
  }, [setUiStateSynced]);

  const dismissOffer = useCallback(async () => {
    const update = pendingUpdateRef.current;
    pendingUpdateRef.current = null;
    if (update) await update.close();
    setUiStateSynced(IDLE_UPDATE_UI_STATE);
  }, [setUiStateSynced]);

  const onLater = useCallback(() => {
    void dismissOffer();
  }, [dismissOffer]);

  const beginInstall = useCallback(async () => {
    if (!isTauri()) return;
    onCloseSettings();
    const state = uiStateRef.current;
    if (pendingUpdateRef.current) {
      await requestApplicationUpdateViaTauri();
      return;
    }
    const checkLabel = state.checkLabel;
    const offeredVersion = state.version;
    if (state.phase !== "offer" || !offeredVersion) return;

    if (checkLabel && checkLabel !== selfLabelRef.current) {
      try {
        const labels = await listOpenWindowLabelsViaTauri();
        if (labels.includes(checkLabel)) {
          await beginApplicationUpdateInstallViaTauri(checkLabel);
          return;
        }
      } catch {
        await abortUpdateInstall();
        onUpdateToast("更新の入れ直しに失敗しました");
        return;
      }
    }

    try {
      const fresh = await check();
      if (
        !fresh ||
        !shouldAcceptAutoUpdate(fresh.currentVersion, fresh.version)
      ) {
        await fresh?.close();
        await abortUpdateInstall();
        return;
      }
      if (!versionsMatchOffer(offeredVersion, fresh.version)) {
        await fresh.close();
        await abortUpdateInstall();
        return;
      }
      pendingUpdateRef.current = fresh;
      await requestApplicationUpdateViaTauri();
    } catch {
      await abortUpdateInstall();
      onUpdateToast("更新の入れ直しに失敗しました");
    }
  }, [
    abortUpdateInstall,
    onCloseSettings,
    onUpdateToast,
    versionsMatchOffer,
  ]);

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
          setUiStateSynced(IDLE_UPDATE_UI_STATE);
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

    void listen("application-update-proceed", async () => {
      const state = uiStateRef.current;
      const checkLabel = state.checkLabel;
      if (checkLabel && checkLabel !== selfLabelRef.current) {
        return;
      }
      let update = pendingUpdateRef.current;
      if (!update) {
        const offeredVersion = state.version;
        if (!offeredVersion) {
          await abortUpdateInstall();
          return;
        }
        try {
          const fresh = await check();
          if (
            !fresh ||
            !shouldAcceptAutoUpdate(fresh.currentVersion, fresh.version)
          ) {
            await fresh?.close();
            await abortUpdateInstall();
            return;
          }
          if (!versionsMatchOffer(offeredVersion, fresh.version)) {
            await fresh.close();
            await abortUpdateInstall();
            return;
          }
          pendingUpdateRef.current = fresh;
          update = fresh;
        } catch {
          await abortUpdateInstall();
          onUpdateToast("更新の入れ直しに失敗しました");
          return;
        }
      }
      const installUpdate = pendingUpdateRef.current;
      if (!installUpdate) {
        await abortUpdateInstall();
        return;
      }
      const version = installUpdate.version;
      setUiStateSynced({
        phase: "installing",
        version,
        message: updateInstallingMessage(version),
        checkLabel: state.checkLabel,
      });
      try {
        await installUpdate.downloadAndInstall();
      } catch {
        pendingUpdateRef.current = null;
        await cancelApplicationUpdateViaTauri();
        onUpdateToast("更新の入れ直しに失敗しました");
        setUiStateSynced(IDLE_UPDATE_UI_STATE);
        return;
      }
      pendingUpdateRef.current = null;
      await relaunch();
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlistenProceed = fn;
    });

    void listen("application-update-cancelled", async () => {
      const update = pendingUpdateRef.current;
      pendingUpdateRef.current = null;
      if (update) await update.close();
      onUpdatePromptCancel();
      setUiStateSynced(IDLE_UPDATE_UI_STATE);
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
  }, [
    abortUpdateInstall,
    onUpdatePromptCancel,
    onUpdateToast,
    prepareForApplicationUpdate,
    setUiStateSynced,
    versionsMatchOffer,
  ]);

  const showCornerNotice =
    (isTauri() || import.meta.env.MODE === "manual-screenshot") &&
    !storeDistribution &&
    !settingsOpen &&
    focusedLabel === selfLabelRef.current &&
    (uiState.phase === "offer" ||
      uiState.phase === "installing" ||
      uiState.phase === "checking" ||
      (uiState.phase === "info" && Boolean(uiState.infoEphemeral)));

  const showSettingsUpdatePanel =
    !storeDistribution &&
    settingsOpen &&
    settingsSection === "updates" &&
    (uiState.phase === "checking" ||
      uiState.phase === "offer" ||
      uiState.phase === "installing" ||
      uiState.phase === "info");

  useEffect(() => {
    if (import.meta.env.MODE !== "manual-screenshot") return;
    window.__manualScreenshotShowUpdateOffer = () => {
      setUiState({
        phase: "offer",
        version: "1.5.0",
        message: updateOfferMessage("1.5.0"),
        checkLabel: selfLabelRef.current,
      });
    };
    return () => {
      delete window.__manualScreenshotShowUpdateOffer;
    };
  }, []);

  const offerLiveAnnouncementKey =
    uiState.phase === "offer" && uiState.version
      ? `${uiState.checkLabel ?? ""}:${uiState.version}:${offerLiveTokenRef.current}`
      : undefined;

  const registerOfferAnnouncement = useCallback((key: string) => {
    return !announcedOfferKeysRef.current.has(key);
  }, []);

  const markOfferAnnounced = useCallback((key: string) => {
    announcedOfferKeysRef.current.add(key);
  }, []);

  return {
    uiState,
    showCornerNotice,
    showSettingsUpdatePanel,
    requestManualUpdateCheck,
    onLater,
    beginInstall,
    dismissUpdateInfo,
    offerLiveAnnouncementKey,
    registerOfferAnnouncement,
    markOfferAnnounced,
    isUpdateBusy: isUpdateOfferActive(uiState) || uiState.phase === "installing",
  };
}

declare global {
  interface Window {
    __manualScreenshotShowUpdateOffer?: () => void;
  }
}

/** @deprecated use useAppUpdateFlow */
export const useAppAutoUpdate = useAppUpdateFlow;
