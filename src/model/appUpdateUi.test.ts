import { describe, expect, it } from "vitest";
import {
  canStartUpdateCheck,
  IDLE_UPDATE_UI_STATE,
  shouldRetainUpdateUiOnRecheck,
} from "./appUpdateUi";

describe("canStartUpdateCheck", () => {
  it("allows idle and ephemeral info", () => {
    expect(canStartUpdateCheck(IDLE_UPDATE_UI_STATE)).toBe(true);
    expect(
      canStartUpdateCheck({
        phase: "info",
        message: "この版が最新です",
        infoEphemeral: true,
      }),
    ).toBe(true);
  });

  it("blocks checking, offer, and installing", () => {
    expect(canStartUpdateCheck({ phase: "checking" })).toBe(false);
    expect(canStartUpdateCheck({ phase: "offer", version: "1.5.0" })).toBe(
      false,
    );
    expect(canStartUpdateCheck({ phase: "installing", version: "1.5.0" })).toBe(
      false,
    );
  });
});

describe("shouldRetainUpdateUiOnRecheck", () => {
  it("retains offer and checking only", () => {
    expect(shouldRetainUpdateUiOnRecheck({ phase: "offer" })).toBe(true);
    expect(shouldRetainUpdateUiOnRecheck({ phase: "checking" })).toBe(true);
    expect(shouldRetainUpdateUiOnRecheck({ phase: "installing" })).toBe(false);
    expect(shouldRetainUpdateUiOnRecheck(IDLE_UPDATE_UI_STATE)).toBe(false);
  });
});
