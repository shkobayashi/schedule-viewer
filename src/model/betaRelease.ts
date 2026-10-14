import { compareReleaseVersions, parseReleaseVersion } from "./releaseVersion";

const BETA_TAG_RE = /^v(\d+\.\d+\.\d+-beta\.\d+)$/i;
const UPDATER_TAG_RE = /^updater-\d+$/i;

export function versionFromReleaseTag(tag: string): string | null {
  const beta = BETA_TAG_RE.exec(tag.trim());
  if (beta) return beta[1];
  if (tag.startsWith("v") && parseReleaseVersion(tag.slice(1))) {
    return tag.slice(1);
  }
  return null;
}

export function isBetaReleaseTag(tag: string): boolean {
  return BETA_TAG_RE.test(tag.trim());
}

export function isUpdaterReleaseTag(tag: string): boolean {
  return UPDATER_TAG_RE.test(tag.trim());
}

export function pickLatestBetaVersion(tags: string[]): string | null {
  let latest: string | null = null;
  for (const tag of tags) {
    if (!isBetaReleaseTag(tag) || isUpdaterReleaseTag(tag)) continue;
    const version = versionFromReleaseTag(tag);
    if (!version || parseReleaseVersion(version)?.kind !== "beta") continue;
    if (latest === null) {
      latest = version;
      continue;
    }
    const cmp = compareReleaseVersions(latest, version);
    if (cmp !== null && cmp < 0) latest = version;
  }
  return latest;
}

/** 入っている版より新しいベータだけ true */
export function isNewerBetaThanInstalled(
  installedVersion: string,
  candidateVersion: string,
): boolean {
  const cmp = compareReleaseVersions(installedVersion, candidateVersion);
  return cmp !== null && cmp < 0;
}

export function pickSaveableBetaVersion(
  installedVersion: string,
  tags: string[],
): string | null {
  const latest = pickLatestBetaVersion(tags);
  if (!latest) return null;
  if (!isNewerBetaThanInstalled(installedVersion, latest)) return null;
  return latest;
}

export function betaInstallerFileSuffix(platform: "windows" | "linux"): string {
  return platform === "windows" ? "_x64-setup.exe" : "_amd64.deb";
}

export function pickBetaInstallerFileName(
  version: string,
  platform: "windows" | "linux",
): string {
  if (platform === "windows") {
    return `schedule-viewer_${version}_x64-setup.exe`;
  }
  return `schedule-viewer_${version}_amd64.deb`;
}

export function matchBetaInstallerAssetName(
  name: string,
  platform: "windows" | "linux",
): boolean {
  const suffix = betaInstallerFileSuffix(platform);
  return name.endsWith(suffix) && !name.includes("latest");
}
