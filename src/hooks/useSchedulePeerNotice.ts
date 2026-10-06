import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { RELOAD_NOTICE_MS } from "./scheduleFile/constants";
import {
  emitSchedulePeerNoticeViaTauri,
  focusScheduleWindowViaTauri,
  registerWindowFocusViaTauri,
  type SchedulePeerNotice,
} from "../model/windowSession";

export type ActivePeerNotice = {
  fileName: string;
  status: SchedulePeerNotice["status"];
  targetLabel: string;
};

type UseSchedulePeerNoticeOptions = {
  filePath: string | null;
  displayFileName: string;
  onWindowFocused?: () => void;
};

export function useSchedulePeerNotice({
  filePath,
  displayFileName,
  onWindowFocused,
}: UseSchedulePeerNoticeOptions) {
  const [peerNotice, setPeerNotice] = useState<ActivePeerNotice | null>(null);
  const selfLabelRef = useRef(isTauri() ? getCurrentWindow().label : "main");
  const onWindowFocusedRef = useRef(onWindowFocused);
  onWindowFocusedRef.current = onWindowFocused;

  useEffect(() => {
    if (!isTauri()) return;
    const onFocus = () => {
      void registerWindowFocusViaTauri()
        .then(() => {
          onWindowFocusedRef.current?.();
        })
        .catch(() => undefined);
    };
    window.addEventListener("focus", onFocus);
    onFocus();
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    void listen<SchedulePeerNotice>("schedule-peer-notice", (event) => {
      const payload = event.payload;
      if (payload.status === "cleared") {
        setPeerNotice((current) =>
          current?.targetLabel === payload.targetLabel ? null : current,
        );
        return;
      }
      if (payload.targetLabel === selfLabelRef.current) {
        return;
      }
      if (payload.status !== "applied" && payload.status !== "pending") {
        return;
      }
      setPeerNotice({
        fileName: payload.fileName,
        status: payload.status,
        targetLabel: payload.targetLabel,
      });
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const notifyPeers = useCallback(
    async (status: SchedulePeerNotice["status"]) => {
      if (!isTauri() || !filePath) return;
      const label = selfLabelRef.current;
      const fileName = displayFileName;
      await emitSchedulePeerNoticeViaTauri(label, fileName, status);
    },
    [displayFileName, filePath],
  );

  const dismissPeerNotice = useCallback(() => {
    setPeerNotice(null);
  }, []);

  useEffect(() => {
    if (peerNotice?.status !== "applied") return;
    const timer = window.setTimeout(() => {
      setPeerNotice(null);
    }, RELOAD_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [peerNotice]);

  const focusPeerTarget = useCallback(async () => {
    if (!peerNotice) return;
    const status = peerNotice.status;
    await focusScheduleWindowViaTauri(peerNotice.targetLabel);
    if (status === "applied") setPeerNotice(null);
  }, [peerNotice]);

  return {
    peerNotice,
    notifyPeers,
    dismissPeerNotice,
    focusPeerTarget,
  };
}
