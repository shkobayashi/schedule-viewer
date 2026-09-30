import { MISSING_FILE_READ_FAILURES } from "./constants";

export function shouldSkipPollTick(flags: {
  cancelled: boolean;
  inFlight: boolean;
  fileBusy: boolean;
  pausePoll: boolean;
}): boolean {
  return flags.cancelled || flags.inFlight || flags.fileBusy || flags.pausePoll;
}

export function shouldIgnorePolledContents(flags: {
  cancelled: boolean;
  fileBusy: boolean;
  pausePoll: boolean;
}): boolean {
  return flags.cancelled || flags.fileBusy || flags.pausePoll;
}

export function shouldDropExternalReload(flags: {
  fileBusy: boolean;
  pausePoll: boolean;
}): boolean {
  return flags.fileBusy || flags.pausePoll;
}

export function recordPollReadFailure(state: {
  failures: number;
  missingPrompted: boolean;
  fileBusy: boolean;
  pausePoll: boolean;
}): { failures: number; promptMissing: boolean } {
  const failures = state.failures + 1;
  const promptMissing =
    failures >= MISSING_FILE_READ_FAILURES &&
    !state.missingPrompted &&
    !state.fileBusy &&
    !state.pausePoll;
  return { failures, promptMissing };
}
