import { execFileSync } from "node:child_process";
import { isValidReleaseVersion } from "../src/model/releaseVersion.ts";

const STABLE_TAG_RE = /^v(\d+\.\d+\.\d+)$/;

export function requireGithubSha(): string {
  const sha = process.env.GITHUB_SHA;
  if (!sha) {
    console.error("GITHUB_SHA is required");
    process.exit(1);
  }
  return sha;
}

export function releaseExists(repo: string, tag: string): boolean {
  try {
    execFileSync("gh", ["release", "view", tag, "--repo", repo], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/** Stable vX.Y.Z tags only; prerelease and updater-X are excluded. Paginates. */
export function listExistingStableVersions(repo: string): string[] {
  const out = execFileSync(
    "gh",
    [
      "api",
      `repos/${repo}/releases`,
      "--paginate",
      "--jq",
      ".[] | select(.prerelease == false) | .tag_name",
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  const tags = out.trim().split("\n").filter(Boolean);
  const versions: string[] = [];
  for (const tag of tags) {
    if (tag.startsWith("updater-")) continue;
    const match = STABLE_TAG_RE.exec(tag);
    if (match && isValidReleaseVersion(match[1])) {
      versions.push(match[1]);
    }
  }
  return versions;
}
