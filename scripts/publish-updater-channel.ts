import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import {
  parseReleaseVersion,
  shouldUpdateUpdaterChannel,
  updaterTagForMajor,
} from "../src/model/releaseVersion.ts";
import {
  releaseExists,
  requireGithubSha,
} from "./gh-release-utils.ts";
import { readPackageJsonVersion } from "./project-version-files.ts";

function readChannelVersion(repo: string, tag: string): string {
  const dir = "dist-release/channel-read";
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  try {
    execFileSync(
      "gh",
      [
        "release",
        "download",
        tag,
        "--repo",
        repo,
        "--dir",
        dir,
        "--pattern",
        "latest.json",
      ],
      { stdio: "ignore" },
    );
  } catch {
    console.error(
      `Could not download latest.json from updater channel ${tag}`,
    );
    process.exit(1);
  }
  let json: { version?: string };
  try {
    json = JSON.parse(readFileSync(`${dir}/latest.json`, "utf8")) as {
      version?: string;
    };
  } catch {
    console.error(`Could not parse latest.json on updater channel ${tag}`);
    process.exit(1);
  }
  const channelVersion = json.version;
  if (typeof channelVersion !== "string") {
    console.error(`latest.json on ${tag} has no version field`);
    process.exit(1);
  }
  if (!parseReleaseVersion(channelVersion)) {
    console.error(
      `latest.json on ${tag} has invalid version: ${channelVersion}`,
    );
    process.exit(1);
  }
  return channelVersion;
}

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error(
    "usage: npx tsx scripts/publish-updater-channel.ts <latest.json>",
  );
  process.exit(1);
}

const version = readPackageJsonVersion();
const parsed = parseReleaseVersion(version);
if (!parsed || parsed.kind !== "stable") {
  console.error(`Stable version required, got ${version}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  version?: string;
};
if (manifest.version !== version) {
  console.error(
    `Manifest version ${manifest.version ?? "?"} does not match ${version}`,
  );
  process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY ?? "shkobayashi/schedule-viewer";
const channelTag = updaterTagForMajor(parsed.major);
const channelExists = releaseExists(repo, channelTag);
const channelVersion = channelExists
  ? readChannelVersion(repo, channelTag)
  : null;

const shouldUpdate = shouldUpdateUpdaterChannel(version, channelVersion);
if (shouldUpdate === null) {
  console.error(`Invalid updater channel decision for ${version}`);
  process.exit(1);
}

if (!shouldUpdate) {
  console.log(
    `Skipping updater channel ${channelTag}: channel is already at ${channelVersion ?? "unknown"}`,
  );
  process.exit(0);
}

const body = readFileSync("scripts/release-body-updater-channel.md", "utf8");
const channelName = `${parsed.major} 系の自動更新`;

if (!channelExists) {
  const target = requireGithubSha();
  execFileSync(
    "gh",
    [
      "release",
      "create",
      channelTag,
      manifestPath,
      "--repo",
      repo,
      "--target",
      target,
      "--title",
      channelName,
      "--notes",
      body,
      "--prerelease",
      "--latest=false",
    ],
    { stdio: "inherit" },
  );
  console.log(`Created ${channelTag} target=${target} with ${manifestPath}`);
} else {
  execFileSync(
    "gh",
    [
      "release",
      "upload",
      channelTag,
      "--repo",
      repo,
      manifestPath,
      "--clobber",
    ],
    { stdio: "inherit" },
  );
  console.log(`Updated ${channelTag} with ${manifestPath}`);
}
