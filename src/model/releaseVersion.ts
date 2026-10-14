export type ParsedReleaseVersion =
  | { kind: "stable"; major: number; minor: number; patch: number }
  | {
      kind: "beta";
      major: number;
      minor: number;
      patch: number;
      beta: number;
    };

const STABLE_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const BETA_RE = /^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/;

function parseVersionComponent(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  if (raw.length > 1 && raw.startsWith("0")) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return null;
  return value;
}

function parseBetaNumber(raw: string): number | null {
  const value = parseVersionComponent(raw);
  if (value === null || value < 1) return null;
  return value;
}

export function parseReleaseVersion(
  version: string,
): ParsedReleaseVersion | null {
  const stable = STABLE_RE.exec(version);
  if (stable) {
    const major = parseVersionComponent(stable[1]);
    const minor = parseVersionComponent(stable[2]);
    const patch = parseVersionComponent(stable[3]);
    if (major === null || minor === null || patch === null) return null;
    return { kind: "stable", major, minor, patch };
  }
  const beta = BETA_RE.exec(version);
  if (beta) {
    const major = parseVersionComponent(beta[1]);
    const minor = parseVersionComponent(beta[2]);
    const patch = parseVersionComponent(beta[3]);
    const betaNum = parseBetaNumber(beta[4]);
    if (
      major === null ||
      minor === null ||
      patch === null ||
      betaNum === null
    ) {
      return null;
    }
    return { kind: "beta", major, minor, patch, beta: betaNum };
  }
  return null;
}

export function isValidReleaseVersion(version: string): boolean {
  return parseReleaseVersion(version) !== null;
}

export function formatStableVersion(parts: {
  major: number;
  minor: number;
  patch: number;
}): string {
  return `${parts.major}.${parts.minor}.${parts.patch}`;
}

export function baseVersion(version: string): string | null {
  const parsed = parseReleaseVersion(version);
  if (!parsed) return null;
  return formatStableVersion(parsed);
}

export function releaseTagForVersion(version: string): string {
  return `v${version}`;
}

const DEFAULT_UPDATER_REPO = "shkobayashi/schedule-viewer";

export function updaterTagForMajor(major: number): string {
  return `updater-${major}`;
}

export function updaterEndpointForVersion(
  version: string,
  repo: string = DEFAULT_UPDATER_REPO,
): string {
  const parsed = parseReleaseVersion(version);
  if (!parsed) {
    throw new Error(`Invalid version for updater endpoint: ${version}`);
  }
  const tag = updaterTagForMajor(parsed.major);
  return `https://github.com/${repo}/releases/download/${tag}/latest.json`;
}

/** Negative if a is older than b, positive if newer, zero if equal. */
export function compareReleaseVersions(a: string, b: string): number | null {
  const left = parseReleaseVersion(a);
  const right = parseReleaseVersion(b);
  if (!left || !right) return null;
  if (left.major !== right.major) {
    return left.major < right.major ? -1 : 1;
  }
  if (left.minor !== right.minor) {
    return left.minor < right.minor ? -1 : 1;
  }
  if (left.patch !== right.patch) {
    return left.patch < right.patch ? -1 : 1;
  }
  const leftBeta = left.kind === "beta" ? left.beta : null;
  const rightBeta = right.kind === "beta" ? right.beta : null;
  if (leftBeta === null && rightBeta === null) return 0;
  if (leftBeta !== null && rightBeta === null) return -1;
  if (leftBeta === null && rightBeta !== null) return 1;
  if (leftBeta! < rightBeta!) return -1;
  if (leftBeta! > rightBeta!) return 1;
  return 0;
}

export function shouldMarkGitHubReleaseLatest(
  releaseVersion: string,
  existingStableVersions: string[],
): boolean | null {
  const parsed = parseReleaseVersion(releaseVersion);
  if (!parsed || parsed.kind !== "stable") return null;
  for (const existing of existingStableVersions) {
    const other = parseReleaseVersion(existing);
    if (!other || other.kind !== "stable") continue;
    if (other.major > parsed.major) {
      return false;
    }
  }
  return true;
}

export function shouldUpdateUpdaterChannel(
  releaseVersion: string,
  channelVersion: string | null,
): boolean | null {
  const parsed = parseReleaseVersion(releaseVersion);
  if (!parsed || parsed.kind !== "stable") return null;
  if (channelVersion === null) return true;
  const cmp = compareReleaseVersions(channelVersion, releaseVersion);
  if (cmp === null) return null;
  return cmp < 0;
}

export function bumpMajor(version: string): string {
  const parsed = parseReleaseVersion(version);
  if (!parsed || parsed.kind !== "stable") {
    throw new Error("major bump requires a stable X.Y.Z version");
  }
  return formatStableVersion({
    major: parsed.major + 1,
    minor: 0,
    patch: 0,
  });
}

export function bumpMinor(version: string): string {
  const parsed = parseReleaseVersion(version);
  if (!parsed || parsed.kind !== "stable") {
    throw new Error("minor bump requires a stable X.Y.Z version");
  }
  return formatStableVersion({
    major: parsed.major,
    minor: parsed.minor + 1,
    patch: 0,
  });
}

export function bumpPatch(version: string): string {
  const parsed = parseReleaseVersion(version);
  if (!parsed || parsed.kind !== "stable") {
    throw new Error("patch bump requires a stable X.Y.Z version");
  }
  return formatStableVersion({
    major: parsed.major,
    minor: parsed.minor,
    patch: parsed.patch + 1,
  });
}

export function bumpBeta(version: string): string {
  const parsed = parseReleaseVersion(version);
  if (!parsed) {
    throw new Error("invalid version");
  }
  if (parsed.kind === "stable") {
    return `${formatStableVersion(parsed)}-beta.1`;
  }
  return `${formatStableVersion(parsed)}-beta.${parsed.beta + 1}`;
}

export function stripBetaSuffix(version: string): string {
  const parsed = parseReleaseVersion(version);
  if (!parsed || parsed.kind !== "beta") {
    throw new Error("stable conversion requires X.Y.Z-beta.N");
  }
  return formatStableVersion(parsed);
}

export type ReleaseBranchKind = "main" | "release";

export type ReleasePushDecision =
  | {
      ok: true;
      prerelease: boolean;
      tag: string;
    }
  | { ok: false; message: string };

export function parseReleaseBranchName(
  branch: string,
): { kind: ReleaseBranchKind; releaseBase?: string } | null {
  if (branch === "main") {
    return { kind: "main" };
  }
  const match = /^release\/(\d+\.\d+\.\d+)$/.exec(branch);
  if (!match) return null;
  const base = match[1];
  if (!isValidReleaseVersion(base)) return null;
  return { kind: "release", releaseBase: base };
}

export function evaluateReleasePush(input: {
  branch: string;
  version: string;
  commitSha: string;
  tagCommitSha: string | null;
}): ReleasePushDecision {
  if (!isValidReleaseVersion(input.version)) {
    return { ok: false, message: `Invalid version: ${input.version}` };
  }

  const branchInfo = parseReleaseBranchName(input.branch);
  if (!branchInfo) {
    return {
      ok: false,
      message: `Unsupported branch for release: ${input.branch}`,
    };
  }

  const parsed = parseReleaseVersion(input.version);
  if (!parsed) {
    return { ok: false, message: `Invalid version: ${input.version}` };
  }

  const base = formatStableVersion(parsed);
  const tag = releaseTagForVersion(input.version);

  if (branchInfo.kind === "main") {
    if (parsed.kind === "beta") {
      return {
        ok: false,
        message: "main must not carry a beta version suffix",
      };
    }
  } else {
    if (parsed.kind !== "beta") {
      return {
        ok: false,
        message:
          "release/* must use X.Y.Z-beta.N; remove the beta suffix on main instead",
      };
    }
    if (branchInfo.releaseBase !== base) {
      return {
        ok: false,
        message: `Branch release/${branchInfo.releaseBase} does not match version base ${base}`,
      };
    }
  }

  if (input.tagCommitSha !== null && input.tagCommitSha !== input.commitSha) {
    return {
      ok: false,
      message: `Tag ${tag} already exists on a different commit`,
    };
  }

  return {
    ok: true,
    prerelease: parsed.kind === "beta",
    tag,
  };
}
