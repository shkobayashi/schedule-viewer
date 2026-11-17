import { describe, expect, it } from "vitest";
import {
  canStartUpdateCheck,
  formatOfferVersionLabel,
  IDLE_UPDATE_UI_STATE,
  isUpdateOfferActive,
  shouldRetainUpdateUiOnRecheck,
  updateInstallingMessage,
  updateOfferMessage,
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

describe("update offer copy", () => {
  it("strips a leading v from unknown version labels", () => {
    expect(formatOfferVersionLabel("v9.9.9")).toBe("9.9.9");
    expect(updateOfferMessage("v9.9.9")).toBe("バージョン 9.9.9 があります");
    expect(updateInstallingMessage("v9.9.9")).toBe(
      "バージョン 9.9.9 を入れ直しています",
    );
  });
});

describe("isUpdateOfferActive", () => {
  it("is true while checking or offering an update", () => {
    expect(isUpdateOfferActive({ phase: "checking" })).toBe(true);
    expect(isUpdateOfferActive({ phase: "offer", version: "1.0.0" })).toBe(true);
    expect(isUpdateOfferActive(IDLE_UPDATE_UI_STATE)).toBe(false);
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
