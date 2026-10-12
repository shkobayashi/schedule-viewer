import { readFileSync, writeFileSync } from "node:fs";

export function readPackageJsonVersion(): string {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    version: string;
  };
  return pkg.version;
}

export function readAllProjectVersions(): Record<string, string> {
  return {
    "package.json": readPackageJsonVersion(),
    "package-lock.json": readPackageLockVersion(),
    "src-tauri/tauri.conf.json": readTauriConfVersion(),
    "src-tauri/Cargo.toml": readCargoTomlVersion(),
    "src-tauri/Cargo.lock (schedule-viewer)": readCargoLockCrateVersion(),
  };
}

function readTauriConfVersion(): string {
  const conf = JSON.parse(
    readFileSync("src-tauri/tauri.conf.json", "utf8"),
  ) as { version: string };
  return conf.version;
}

function readCargoTomlVersion(): string {
  const text = readFileSync("src-tauri/Cargo.toml", "utf8");
  const match = text.match(/^version\s*=\s*"([^"]+)"/m);
  if (!match) {
    throw new Error("Could not find version in src-tauri/Cargo.toml");
  }
  return match[1];
}

function readCargoLockCrateVersion(): string {
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

function readPackageLockVersion(): string {
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as {
    version?: string;
    packages?: Record<string, { version?: string }>;
  };
  const root = lock.packages?.[""]?.version ?? lock.version;
  if (!root) {
    throw new Error("Could not find root version in package-lock.json");
  }
  return root;
}

export function writeProjectVersion(next: string): void {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    version: string;
  };
  pkg.version = next;
  writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);

  const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as {
    version?: string;
    packages?: Record<string, { version?: string }>;
  };
  lock.version = next;
  if (lock.packages?.[""]) {
    lock.packages[""].version = next;
  }
  writeFileSync("package-lock.json", `${JSON.stringify(lock, null, 2)}\n`);

  const tauriConf = JSON.parse(
    readFileSync("src-tauri/tauri.conf.json", "utf8"),
  ) as { version: string };
  tauriConf.version = next;
  writeFileSync(
    "src-tauri/tauri.conf.json",
    `${JSON.stringify(tauriConf, null, 2)}\n`,
  );

  let cargoToml = readFileSync("src-tauri/Cargo.toml", "utf8");
  if (!/^version\s*=/m.test(cargoToml)) {
    throw new Error("Could not find version in src-tauri/Cargo.toml");
  }
  cargoToml = cargoToml.replace(
    /^version\s*=\s*"[^"]+"/m,
    `version = "${next}"`,
  );
  writeFileSync("src-tauri/Cargo.toml", cargoToml);

  let cargoLock = readFileSync("src-tauri/Cargo.lock", "utf8");
  const blockRe =
    /(\[\[package\]\]\nname = "schedule-viewer"\nversion = )"[^"]+"/;
  if (!blockRe.test(cargoLock)) {
    throw new Error("Could not find schedule-viewer in src-tauri/Cargo.lock");
  }
  cargoLock = cargoLock.replace(blockRe, `$1"${next}"`);
  writeFileSync("src-tauri/Cargo.lock", cargoLock);
}
