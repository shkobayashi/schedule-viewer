import { normalizeVersionLabel } from "./releaseNotes";

export type ApplicationUpdateUiPhase =
  | "idle"
  | "checking"
  | "offer"
  | "installing"
  | "info";

export type ApplicationUpdateUiState = {
  phase: ApplicationUpdateUiPhase;
  version?: string;
  message?: string;
  infoEphemeral?: boolean;
  checkLabel?: string;
};

export const IDLE_UPDATE_UI_STATE: ApplicationUpdateUiState = {
  phase: "idle",
};

export function formatOfferVersionLabel(rawVersion: string): string {
  return normalizeVersionLabel(rawVersion) ?? rawVersion.replace(/^[vV]/, "");
}

export function updateOfferMessage(version: string): string {
  return `バージョン ${formatOfferVersionLabel(version)} があります`;
}

export function updateInstallingMessage(version: string): string {
  return `バージョン ${formatOfferVersionLabel(version)} を入れ直しています`;
}

export function canStartUpdateCheck(state: ApplicationUpdateUiState): boolean {
  if (
    state.phase === "checking" ||
    state.phase === "installing" ||
    state.phase === "offer"
  ) {
    return false;
  }
  return state.phase === "idle" || state.phase === "info";
}

export function isUpdateOfferActive(state: ApplicationUpdateUiState): boolean {
  return state.phase === "offer" || state.phase === "checking";
}

export function shouldRetainUpdateUiOnRecheck(
  state: ApplicationUpdateUiState,
): boolean {
  return state.phase === "offer" || state.phase === "checking";
}
