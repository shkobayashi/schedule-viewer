import { readFileSync } from "node:fs";

function readPackageJsonVersion() {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  return pkg.version;
}

function readTauriConfVersion() {
  const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
  return conf.version;
}

function readCargoTomlVersion() {
  const text = readFileSync("src-tauri/Cargo.toml", "utf8");
  const match = text.match(/^version\s*=\s*"([^"]+)"/m);
  if (!match) {
    throw new Error("Could not find version in src-tauri/Cargo.toml");
  }
  return match[1];
}

function readCargoLockCrateVersion() {
  const text = readFileSync("src-tauri/Cargo.lock", "utf8");
  const match = text.match(
    /\[\[package\]\]\nname = "schedule-viewer"\nversion = "([^"]+)"/,
  );
  if (!match) {
    throw new Error(
      "Could not find schedule-viewer version in src-tauri/Cargo.lock",
    );
  }
  return match[1];
}

function readPackageLockVersion() {
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  const root = lock.packages?.[""]?.version ?? lock.version;
  if (!root) {
    throw new Error("Could not find root version in package-lock.json");
  }
  return root;
}

const sources = {
  "package.json": readPackageJsonVersion(),
  "package-lock.json": readPackageLockVersion(),
  "src-tauri/tauri.conf.json": readTauriConfVersion(),
  "src-tauri/Cargo.toml": readCargoTomlVersion(),
  "src-tauri/Cargo.lock (schedule-viewer)": readCargoLockCrateVersion(),
};

const versions = Object.values(sources);
const expected = versions[0];
const mismatched = Object.entries(sources).filter(([, v]) => v !== expected);

if (mismatched.length > 0) {
  console.error("Version mismatch across project files:");
  for (const [file, version] of Object.entries(sources)) {
    console.error(`  ${file}: ${version}`);
  }
  process.exit(1);
}

console.log(`All versions match: ${expected}`);
