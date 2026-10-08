import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import changelogMd from "../../CHANGELOG.md?raw";
import type { ReleaseNotesForVersion } from "../model/releaseNotes";
import { parseReleaseNotesForVersion } from "../model/releaseNotes";
import {
  clearPendingReleaseNotesViaTauri,
  peekPendingReleaseNotesViaTauri,
} from "../model/windowSession";

type GateState = "waiting" | "checking" | "showing" | "ready";

export function usePendingReleaseNotes(startupSettled: boolean) {
  const [gateState, setGateState] = useState<GateState>("waiting");
  const [notes, setNotes] = useState<ReleaseNotesForVersion | null>(null);

  useEffect(() => {
    if (!startupSettled) {
      setGateState("waiting");
      setNotes(null);
      return;
    }
    if (!isTauri()) {
      setGateState("ready");
      return;
    }
    if (gateState !== "waiting") return;

    void (async () => {
      setGateState("checking");
      try {
        const version = await peekPendingReleaseNotesViaTauri();
        if (!version) {
          setGateState("ready");
          return;
        }
        const parsed = parseReleaseNotesForVersion(changelogMd, version);
        if (!parsed) {
          await clearPendingReleaseNotesViaTauri();
          setGateState("ready");
          return;
        }
        setNotes(parsed);
        setGateState("showing");
      } catch {
        setGateState("ready");
      }
    })();
  }, [startupSettled, gateState]);

  const dismissReleaseNotes = useCallback(() => {
    void (async () => {
      try {
        await clearPendingReleaseNotesViaTauri();
      } catch {
        // ignore
      }
      setNotes(null);
      setGateState("ready");
    })();
  }, []);

  const startupReportingReady =
    !isTauri() || (startupSettled && gateState === "ready");

  return {
    releaseNotes: notes,
    showReleaseNotes: gateState === "showing" && notes !== null,
    dismissReleaseNotes,
    startupReportingReady,
  };
}
