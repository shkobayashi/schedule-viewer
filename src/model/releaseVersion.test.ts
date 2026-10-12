import { describe, expect, it } from "vitest";
import {
  bumpBeta,
  bumpMajor,
  bumpMinor,
  bumpPatch,
  evaluateReleasePush,
  isValidReleaseVersion,
  parseReleaseVersion,
  stripBetaSuffix,
} from "./releaseVersion";

describe("isValidReleaseVersion", () => {
  it("accepts stable versions", () => {
    expect(isValidReleaseVersion("1.4.0")).toBe(true);
    expect(isValidReleaseVersion("0.0.0")).toBe(true);
  });

  it("accepts beta versions", () => {
    expect(isValidReleaseVersion("1.5.0-beta.1")).toBe(true);
    expect(isValidReleaseVersion("1.5.0-beta.12")).toBe(true);
  });

  it("rejects invalid shapes", () => {
    expect(isValidReleaseVersion("1.4")).toBe(false);
    expect(isValidReleaseVersion("1.4.0-beta")).toBe(false);
    expect(isValidReleaseVersion("1.4.0-beta.0")).toBe(false);
    expect(isValidReleaseVersion("1.4.0-beta.01")).toBe(false);
    expect(isValidReleaseVersion("v1.4.0")).toBe(false);
    expect(isValidReleaseVersion("1.02.3")).toBe(false);
    expect(isValidReleaseVersion("1.2.03-beta.1")).toBe(false);
  });
});

describe("parseReleaseVersion", () => {
  it("parses beta", () => {
    expect(parseReleaseVersion("2.0.0-beta.3")).toEqual({
      kind: "beta",
      major: 2,
      minor: 0,
      patch: 0,
      beta: 3,
    });
  });
});

describe("bump helpers", () => {
  it("bumps major, minor, patch on stable only", () => {
    expect(bumpMajor("1.2.3")).toBe("2.0.0");
    expect(bumpMinor("1.2.3")).toBe("1.3.0");
    expect(bumpPatch("1.2.3")).toBe("1.2.4");
    expect(() => bumpMajor("1.2.3-beta.1")).toThrow();
    expect(() => bumpMinor("1.2.3-beta.1")).toThrow();
    expect(() => bumpPatch("1.2.3-beta.1")).toThrow();
  });

  it("bumps beta from stable and from beta", () => {
    expect(bumpBeta("1.5.0")).toBe("1.5.0-beta.1");
    expect(bumpBeta("1.5.0-beta.1")).toBe("1.5.0-beta.2");
  });

  it("strips beta suffix", () => {
    expect(stripBetaSuffix("1.5.0-beta.2")).toBe("1.5.0");
    expect(() => stripBetaSuffix("1.5.0")).toThrow();
  });
});

describe("evaluateReleasePush", () => {
  const sha = "abc123";

  it("allows stable on main", () => {
    expect(
      evaluateReleasePush({
        branch: "main",
        version: "1.5.0",
        commitSha: sha,
        tagCommitSha: null,
      }),
    ).toEqual({ ok: true, prerelease: false, tag: "v1.5.0" });
  });

  it("allows beta on matching release branch", () => {
    expect(
      evaluateReleasePush({
        branch: "release/1.5.0",
        version: "1.5.0-beta.1",
        commitSha: sha,
        tagCommitSha: null,
      }),
    ).toEqual({ ok: true, prerelease: true, tag: "v1.5.0-beta.1" });
  });

  it("rejects beta on main", () => {
    const result = evaluateReleasePush({
      branch: "main",
      version: "1.5.0-beta.1",
      commitSha: sha,
      tagCommitSha: null,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects stable on release branch", () => {
    const result = evaluateReleasePush({
      branch: "release/1.5.0",
      version: "1.5.0",
      commitSha: sha,
      tagCommitSha: null,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects unsupported release branch name", () => {
    const result = evaluateReleasePush({
      branch: "release/1.5.0-beta.1",
      version: "1.5.0-beta.1",
      commitSha: sha,
      tagCommitSha: null,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects release branch base mismatch", () => {
    const result = evaluateReleasePush({
      branch: "release/1.4.0",
      version: "1.5.0-beta.1",
      commitSha: sha,
      tagCommitSha: null,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects tag on different commit", () => {
    const result = evaluateReleasePush({
      branch: "main",
      version: "1.5.0",
      commitSha: sha,
      tagCommitSha: "other",
    });
    expect(result.ok).toBe(false);
  });

  it("allows retry when tag points at same commit", () => {
    expect(
      evaluateReleasePush({
        branch: "release/1.5.0",
        version: "1.5.0-beta.1",
        commitSha: sha,
        tagCommitSha: sha,
      }),
    ).toEqual({ ok: true, prerelease: true, tag: "v1.5.0-beta.1" });
  });
});
