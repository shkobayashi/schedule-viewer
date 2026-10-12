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
