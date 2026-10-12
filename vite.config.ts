import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
// @ts-expect-error type error without @types/node package
import process from "node:process";

const manualScreenshotDir = fileURLToPath(
  new URL("./scripts/manual-screenshot", import.meta.url),
);
const tauriApiCore = fileURLToPath(
  new URL("./node_modules/@tauri-apps/api/core.js", import.meta.url),
);

const host = process.env.TAURI_DEV_HOST;
// `tauri dev` は beforeDevCommand の `npm run dev` に TAURI_ENV_PLATFORM を渡す。
// そのときだけ 1420 を使い、ブラウザ版の `npm run dev` は別ポートにして同時起動できるようにする。
const isTauriDev = Boolean(process.env.TAURI_ENV_PLATFORM);
const port = isTauriDev ? 1420 : 5173;

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve:
    mode === "manual-screenshot"
      ? {
          alias: {
            "@tauri-apps/api/core": `${manualScreenshotDir}/tauri-core-shim.ts`,
            "@tauri-apps/api/core-original": tauriApiCore,
            "@tauri-apps/api/window": `${manualScreenshotDir}/tauri-window-shim.ts`,
            "@tauri-apps/api/event": `${manualScreenshotDir}/tauri-event-shim.ts`,
            "@tauri-apps/api/app": `${manualScreenshotDir}/tauri-app-shim.ts`,
            "@tauri-apps/api/menu": `${manualScreenshotDir}/tauri-menu-shim.ts`,
          },
        }
      : undefined,

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
