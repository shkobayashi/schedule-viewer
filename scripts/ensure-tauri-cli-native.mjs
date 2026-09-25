/**
 * npm の optional 依存まわりで @tauri-apps/cli のネイティブ binding が欠ける場合の救済。
 * @see https://github.com/npm/cli/issues/4828
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function cliLoads() {
  try {
    require("@tauri-apps/cli");
    return true;
  } catch {
    return false;
  }
}

if (cliLoads()) {
  process.exit(0);
}

let version;
try {
  version = require("@tauri-apps/cli/package.json").version;
} catch {
  process.exit(0);
}

/** @type {Record<string, Record<string, string>>} */
const nativeByPlatform = {
  darwin: {
    arm64: "@tauri-apps/cli-darwin-arm64",
    x64: "@tauri-apps/cli-darwin-x64",
  },
  linux: {
    arm64: "@tauri-apps/cli-linux-arm64-gnu",
    x64: "@tauri-apps/cli-linux-x64-gnu",
  },
  win32: {
    arm64: "@tauri-apps/cli-win32-arm64-msvc",
    x64: "@tauri-apps/cli-win32-x64-msvc",
    ia32: "@tauri-apps/cli-win32-ia32-msvc",
  },
};

const nativePkg = nativeByPlatform[process.platform]?.[process.arch];
if (!nativePkg) {
  console.warn(
    `ensure-tauri-cli-native: 未対応の platform (${process.platform}/${process.arch})`,
  );
  process.exit(0);
}

console.warn(
  `ensure-tauri-cli-native: ${nativePkg}@${version} を追加インストールします…`,
);
const result = spawnSync(
  "npm",
  ["install", "--no-save", "--ignore-scripts", `${nativePkg}@${version}`],
  { stdio: "inherit", env: process.env },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!cliLoads()) {
  console.error(
    "ensure-tauri-cli-native: インストール後も Tauri CLI を読み込めません。node_modules を削除して npm install をやり直してください。",
  );
  process.exit(1);
}
