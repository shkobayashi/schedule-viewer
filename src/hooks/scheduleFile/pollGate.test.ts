import { describe, expect, it } from "vitest";
import {
  recordPollReadFailure,
  shouldDropExternalReload,
  shouldIgnorePolledContents,
  shouldSkipPollTick,
} from "./pollGate";

describe("poll gate", () => {
  it("does not read or apply while a file operation is busy or paused", () => {
    expect(
      shouldSkipPollTick({
        cancelled: false,
        inFlight: false,
        fileBusy: true,
        pausePoll: false,
      }),
    ).toBe(true);
    expect(
      shouldIgnorePolledContents({
        cancelled: false,
        fileBusy: false,
        pausePoll: true,
      }),
    ).toBe(true);
    expect(shouldDropExternalReload({ fileBusy: true, pausePoll: false })).toBe(
      true,
    );
    expect(shouldDropExternalReload({ fileBusy: false, pausePoll: false })).toBe(
      false,
    );
  });

  it("prompts for a missing file on the fifth consecutive read failure", () => {
    let failures = 0;
    let prompted = false;
    for (let i = 0; i < 4; i += 1) {
      const next = recordPollReadFailure({
        failures,
        missingPrompted: prompted,
        fileBusy: false,
        pausePoll: false,
      });
      failures = next.failures;
      expect(next.promptMissing).toBe(false);
    }
    const fifth = recordPollReadFailure({
      failures,
      missingPrompted: prompted,
      fileBusy: false,
      pausePoll: false,
    });
    expect(fifth).toEqual({ failures: 5, promptMissing: true });
    prompted = true;
    expect(
      recordPollReadFailure({
        failures: fifth.failures,
        missingPrompted: prompted,
        fileBusy: false,
        pausePoll: false,
      }).promptMissing,
    ).toBe(false);
  });
});
