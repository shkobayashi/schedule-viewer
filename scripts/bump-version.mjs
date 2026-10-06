import { readFileSync, writeFileSync } from "node:fs";

const kind = process.argv[2];
if (kind !== "major" && kind !== "minor" && kind !== "patch") {
  console.error("Usage: node scripts/bump-version.mjs <major|minor|patch>");
  process.exit(1);
}

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Invalid semver: ${version}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function bump(version, bumpKind) {
  const parts = parseSemver(version);
  if (bumpKind === "major") {
    return `${parts.major + 1}.0.0`;
  }
  if (bumpKind === "minor") {
    return `${parts.major}.${parts.minor + 1}.0`;
  }
  return `${parts.major}.${parts.minor}.${parts.patch + 1}`;
}

const current = JSON.parse(readFileSync("package.json", "utf8")).version;
const next = bump(current, kind);

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
pkg.version = next;
writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
lock.version = next;
if (lock.packages?.[""]) {
  lock.packages[""].version = next;
}
writeFileSync("package-lock.json", `${JSON.stringify(lock, null, 2)}\n`);

const tauriConf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
tauriConf.version = next;
writeFileSync(
  "src-tauri/tauri.conf.json",
  `${JSON.stringify(tauriConf, null, 2)}\n`,
);

let cargoToml = readFileSync("src-tauri/Cargo.toml", "utf8");
if (!/^version\s*=/m.test(cargoToml)) {
  throw new Error("Could not find version in src-tauri/Cargo.toml");
}
cargoToml = cargoToml.replace(/^version\s*=\s*"[^"]+"/m, `version = "${next}"`);
writeFileSync("src-tauri/Cargo.toml", cargoToml);

let cargoLock = readFileSync("src-tauri/Cargo.lock", "utf8");
const blockRe =
  /(\[\[package\]\]\nname = "schedule-viewer"\nversion = )"[^"]+"/;
if (!blockRe.test(cargoLock)) {
  throw new Error('Could not find schedule-viewer in src-tauri/Cargo.lock');
}
cargoLock = cargoLock.replace(blockRe, `$1"${next}"`);
writeFileSync("src-tauri/Cargo.lock", cargoLock);

console.log(`Bumped version: ${current} -> ${next}`);
console.log("Run: npm run version:check");
