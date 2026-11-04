/**
 * Capture guide, shortcuts, hierarchy dialogs and title-edit toolbar (light + dark).
 * Usage:
 *   node scripts/capture-three-dialogs-evidence.mjs --label=before|after
 *   node scripts/capture-three-dialogs-evidence.mjs --compare-only
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";
import { stitchLabeledRowFromPaths } from "./compose-design-comparisons.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COLOR_SCHEME_LS_KEY = "schedule-viewer/color-scheme";
const labelArg = process.argv.find((a) => a.startsWith("--label="));
const label = labelArg?.split("=")[1] ?? "after";
const compareOnly = process.argv.includes("--compare-only");
const beforeDir = path.join("/opt/cursor/artifacts", "dialog-shell-before");
const afterDir = path.join("/opt/cursor/artifacts", "dialog-shell-after");
const compareDir = path.join("/opt/cursor/artifacts", "dialog-shell-compare");
const agentStoreDir = path.join("/cursor/stores/self", "dialog-shell");
const port = label === "before" ? 5181 : 5182;

const COMPARE_SPECS = [
  { base: "shortcuts", schemes: ["light", "dark"], height: 520 },
  { base: "guide", schemes: ["light"], height: 640 },
  { base: "hierarchy", schemes: ["light", "dark"], height: 520 },
  { base: "settings", schemes: ["light", "dark"], height: 640 },
  { base: "toolbar-title-edit", schemes: ["light", "dark"], height: 200 },
];

function waitForServer(url, ms = 120_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      http
        .get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve();
          else if (Date.now() - start > ms) reject(new Error("timeout"));
          else setTimeout(tick, 400);
        })
        .on("error", () => {
          if (Date.now() - start > ms) reject(new Error("timeout"));
          else setTimeout(tick, 400);
        });
    };
    tick();
  });
}

function killPort(p) {
  try {
    spawnSync("fuser", ["-k", `${p}/tcp`], { stdio: "ignore" });
  } catch {
    /* ignore */
  }
}

async function applyColorScheme(page, scheme) {
  await page.emulateMedia({
    colorScheme: scheme === "dark" ? "dark" : "light",
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: COLOR_SCHEME_LS_KEY, value: scheme },
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    (expected) => document.documentElement.dataset.colorScheme === expected,
    scheme,
    { timeout: 30_000 },
  );
  await page.waitForFunction(
    (expected) => {
      const app = document.querySelector(".app");
      const el = app ?? document.body;
      const bg = getComputedStyle(el).backgroundColor;
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return false;
      const avg = (+m[1] + +m[2] + +m[3]) / 3;
      return expected === "dark" ? avg < 72 : avg > 100;
    },
    scheme,
    { timeout: 30_000 },
  );
  await page.waitForSelector(".toolbar-title-text", { timeout: 60_000 });
  await page.waitForTimeout(400);
}

async function readMeanLuminance(imagePath) {
  const stats = await sharp(imagePath).stats();
  const channels = stats.channels.slice(0, 3);
  if (channels.length === 0) throw new Error(`no channels: ${imagePath}`);
  return channels.reduce((sum, ch) => sum + ch.mean, 0) / channels.length;
}

async function sanityCheckCaptureSet(outDir, setLabel) {
  for (const base of [
    "shortcuts",
    "guide",
    "hierarchy",
    "settings",
    "toolbar-title-edit",
  ]) {
    const lightPath = path.join(outDir, `${base}-light.png`);
    const darkPath = path.join(outDir, `${base}-dark.png`);
    if (!fs.existsSync(lightPath) || !fs.existsSync(darkPath)) {
      throw new Error(`${setLabel}: missing ${base} light/dark PNG`);
    }
    const lightSize = fs.statSync(lightPath).size;
    const darkSize = fs.statSync(darkPath).size;
    if (lightSize === darkSize) {
      console.warn(
        `${setLabel}: ${base} light/dark same byte size (${lightSize}); checking luminance…`,
      );
    }
    const lightLum = await readMeanLuminance(lightPath);
    const darkLum = await readMeanLuminance(darkPath);
    if (base === "toolbar-title-edit") {
      if (lightSize === darkSize && fs.readFileSync(lightPath).equals(fs.readFileSync(darkPath))) {
        throw new Error(`${setLabel}: ${base} light and dark PNG are identical`);
      }
    } else if (darkLum >= lightLum - 10) {
      throw new Error(
        `${setLabel}: ${base} dark (${darkLum.toFixed(1)}) not darker than light (${lightLum.toFixed(1)})`,
      );
    }
  }
}

async function captureDialog(page, outDir, name, open) {
  await open();
  await page.waitForTimeout(350);
  const dialog = page.locator('[role="dialog"]').first();
  await dialog.waitFor({ state: "visible", timeout: 10_000 });
  await dialog.screenshot({
    path: path.join(outDir, `${name}.png`),
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}

async function captureSet(captureRoot, captureLabel) {
  const outDir = path.join("/opt/cursor/artifacts", `dialog-shell-${captureLabel}`);
  fs.mkdirSync(outDir, { recursive: true });
  killPort(port);
  const vite = spawn(
    "npm",
    [
      "run",
      "dev:manual-screenshot",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    { cwd: captureRoot, stdio: "ignore", env: { ...process.env } },
  );
  try {
    await waitForServer(`http://127.0.0.1:${port}/`);
    const browser = await chromium.launch();
    for (const scheme of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await applyColorScheme(page, scheme);

      await captureDialog(page, outDir, `shortcuts-${scheme}`, async () => {
        await page.locator("button.shortcuts-btn").click();
      });

      await captureDialog(page, outDir, `guide-${scheme}`, async () => {
        await page.getByRole("button", { name: "案内", exact: true }).click();
      });

      await captureDialog(page, outDir, `hierarchy-${scheme}`, async () => {
        await page.locator("button.toolbar-title-hierarchy-btn").click();
      });

      await captureDialog(page, outDir, `settings-${scheme}`, async () => {
        await page.getByRole("button", { name: "メニュー" }).click();
        await page.getByRole("menuitem", { name: "設定", exact: true }).click();
      });

      await page.getByRole("button", { name: "タイトルを変更" }).click();
      await page.waitForSelector(".toolbar-title-input", { state: "visible" });
      await page.waitForTimeout(200);
      const hierarchyVisible = await page
        .locator(".toolbar-title-hierarchy-btn")
        .isVisible();
      if (captureLabel === "after" && !hierarchyVisible) {
        throw new Error(`title-edit toolbar missing 階層編集 (${scheme})`);
      }
      await page.locator(".toolbar").screenshot({
        path: path.join(outDir, `toolbar-title-edit-${scheme}.png`),
      });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);

      await page.close();
    }
    await browser.close();
    await sanityCheckCaptureSet(outDir, captureLabel);
    console.log(`Saved dialog screenshots to ${outDir}`);
  } finally {
    vite.kill("SIGTERM");
    killPort(port);
  }
}

async function buildCompareImages() {
  fs.mkdirSync(compareDir, { recursive: true });
  fs.mkdirSync(agentStoreDir, { recursive: true });
  const written = [];
  for (const { base, schemes, height } of COMPARE_SPECS) {
    for (const scheme of schemes) {
      const beforePath = path.join(beforeDir, `${base}-${scheme}.png`);
      const afterPath = path.join(afterDir, `${base}-${scheme}.png`);
      if (!fs.existsSync(beforePath) || !fs.existsSync(afterPath)) {
        throw new Error(`Missing before/after for ${base}-${scheme}`);
      }
      const outName = `compare-${base}-${scheme}.png`;
      const outPath = path.join(compareDir, outName);
      await stitchLabeledRowFromPaths(
        [beforePath, afterPath],
        ["変更前", "変更後"],
        outPath,
        height,
      );
      const storePath = path.join(agentStoreDir, outName);
      fs.copyFileSync(outPath, storePath);
      written.push(outPath, storePath);
    }
  }
  console.log(`Wrote ${written.length / 2} compare images to ${compareDir} and ${agentStoreDir}`);
}

async function main() {
  if (compareOnly) {
    await buildCompareImages();
    return;
  }
  const outDir = path.join("/opt/cursor/artifacts", `dialog-shell-${label}`);
  await captureSet(root, label);
  if (label === "after" && fs.existsSync(beforeDir)) {
    await buildCompareImages();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
