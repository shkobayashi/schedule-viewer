import { describe, expect, it } from "vitest";
import {
  isNewerBetaThanInstalled,
  pickLatestBetaVersion,
  pickSaveableBetaVersion,
  matchBetaInstallerAssetName,
} from "./betaRelease";

describe("pickLatestBetaVersion", () => {
  it("ignores updater tags and stable tags", () => {
    expect(
      pickLatestBetaVersion([
        "v1.0.0",
        "updater-1",
        "v1.0.0-beta.1",
        "v1.0.1-beta.2",
      ]),
    ).toBe("1.0.1-beta.2");
  });
});

describe("pickSaveableBetaVersion", () => {
  it("returns null when only older or equal betas exist", () => {
    expect(
      pickSaveableBetaVersion("1.0.0", ["v1.0.0-beta.1", "v1.0.0-beta.2"]),
    ).toBeNull();
    expect(
      pickSaveableBetaVersion("1.0.0-beta.2", ["v1.0.0-beta.1"]),
    ).toBeNull();
  });

  it("returns newer beta", () => {
    expect(
      pickSaveableBetaVersion("1.0.0", ["v1.0.0-beta.1", "v1.0.1-beta.1"]),
    ).toBe("1.0.1-beta.1");
    expect(
      pickSaveableBetaVersion("1.0.0-beta.2", ["v1.0.0-beta.3"]),
    ).toBe("1.0.0-beta.3");
  });
});

describe("isNewerBetaThanInstalled", () => {
  it("treats stable 1.0.0 as newer than 1.0.0-beta.1", () => {
    expect(isNewerBetaThanInstalled("1.0.0", "1.0.0-beta.1")).toBe(false);
  });
});

describe("matchBetaInstallerAssetName", () => {
  it("matches platform installers only", () => {
    expect(
      matchBetaInstallerAssetName(
        "schedule-viewer_1.0.1-beta.1_x64-setup.exe",
        "windows",
      ),
    ).toBe(true);
    expect(
      matchBetaInstallerAssetName("latest.json", "windows"),
    ).toBe(false);
    expect(
      matchBetaInstallerAssetName(
        "schedule-viewer_1.0.1-beta.1_amd64.deb",
        "linux",
      ),
    ).toBe(true);
    expect(
      matchBetaInstallerAssetName("SHA256SUMS", "linux"),
    ).toBe(false);
  });
});
