/**
 * Capture guide, shortcuts, and hierarchy dialogs (light + dark) for dialog-shell evidence.
 * Usage: node scripts/capture-three-dialogs-evidence.mjs --label before|after
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const labelArg = process.argv.find((a) => a.startsWith("--label="));
const label = labelArg?.split("=")[1] ?? "after";
const outDir = path.join("/opt/cursor/artifacts", `dialog-shell-${label}`);
const port = label === "before" ? 5181 : 5182;

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

async function captureDialog(page, name, open) {
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

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  killPort(port);
  const vite = spawn(
    "npm",
    ["run", "dev:manual-screenshot", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: root, stdio: "ignore", env: { ...process.env } },
  );
  try {
    await waitForServer(`http://127.0.0.1:${port}/`);
    const browser = await chromium.launch();
    for (const scheme of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.addInitScript((s) => {
        document.documentElement.dataset.colorScheme = s;
      }, scheme);
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);

      await captureDialog(page, `shortcuts-${scheme}`, async () => {
        await page.locator("button.shortcuts-btn").click();
      });

      await captureDialog(page, `guide-${scheme}`, async () => {
        await page.getByRole("button", { name: "案内", exact: true }).click();
      });

      await captureDialog(page, `hierarchy-${scheme}`, async () => {
        await page.locator("button.toolbar-title-hierarchy-btn").click();
      });

      await page.getByRole("button", { name: "タイトルを変更" }).click();
      await page.waitForSelector(".toolbar-title-input", { state: "visible" });
      await page.waitForTimeout(200);
      const hierarchyVisible = await page
        .locator(".toolbar-title-hierarchy-btn")
        .isVisible();
      if (label === "after" && !hierarchyVisible) {
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
    console.log(`Saved dialog screenshots to ${outDir}`);
  } finally {
    vite.kill("SIGTERM");
    killPort(port);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
