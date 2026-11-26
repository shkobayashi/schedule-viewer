#!/usr/bin/env node
/**
 * Cross-platform wrapper for SCHEDULE_VIEWER_FRESH_START=1 npm run tauri dev
 */
import { spawn } from "node:child_process";

process.env.SCHEDULE_VIEWER_FRESH_START = "1";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(npm, ["run", "tauri", "dev"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
