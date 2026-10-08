import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const platform = process.argv[2];
const version = process.argv[3];
const bundleRoot = process.argv[4];
const repo = process.argv[5] ?? "shkobayashi/schedule-viewer";
const outPath = process.argv[6];

if (!platform || !version || !bundleRoot || !outPath) {
  console.error(
    "usage: node build-platform-latest-json.mjs <platform> <version> <bundleRoot> [repo] <outPath>",
  );
  process.exit(1);
}

function findSigAndBundle(dir, bundlePattern, sigSuffix) {
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
  const bundleName = names.find((name) => bundlePattern.test(name));
  if (!bundleName) {
    throw new Error(`bundle not found in ${dir}`);
  }
  const sigName = `${bundleName}${sigSuffix}`;
  if (!names.includes(sigName)) {
    throw new Error(`signature not found for ${bundleName} in ${dir}`);
  }
  return { bundleName, sigName };
}

let bundleName;
let signature;

if (platform === "linux-x86_64") {
  const debDir = join(bundleRoot, "deb");
  const found = findSigAndBundle(debDir, /\.deb$/, ".sig");
  bundleName = found.bundleName;
  signature = readFileSync(join(debDir, found.sigName), "utf8").trim();
} else if (platform === "windows-x86_64") {
  const nsisDir = join(bundleRoot, "nsis");
  const found = findSigAndBundle(nsisDir, /-setup\.exe$/, ".sig");
  bundleName = found.bundleName;
  signature = readFileSync(join(nsisDir, found.sigName), "utf8").trim();
} else {
  throw new Error(`unsupported platform ${platform}`);
}

const url = `https://github.com/${repo}/releases/download/v${version}/${bundleName}`;
const manifest = {
  version,
  platforms: {
    [platform]: {
      signature,
      url,
    },
  },
};

writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${outPath} for ${platform}`);
