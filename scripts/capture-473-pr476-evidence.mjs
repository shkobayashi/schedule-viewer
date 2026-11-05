/**
 * PR #476 evidence (HEAD build): toolbar with task selected + context menu.
 * Clears Vite cache, seeds sample members, verifies no toolbar inline shortcuts.
 */
import { execSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = "/opt/cursor/artifacts";
const port = 5191;
const COLOR_SCHEME_LS_KEY = "schedule-viewer/color-scheme";
const LS_SAMPLE_SEEDED = "schedule-viewer/members/sample-seeded";
const LS_FIRST_RUN_DISMISSED = "schedule-viewer/first-run/hint-dismissed";
const HEAD = execSync("git rev-parse HEAD", { cwd: root }).toString().trim();

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
    ({ colorKey, colorValue, seededKey, firstRunKey }) => {
      localStorage.setItem(colorKey, colorValue);
      localStorage.removeItem(seededKey);
      localStorage.setItem(firstRunKey, "1");
    },
    {
      colorKey: COLOR_SCHEME_LS_KEY,
      colorValue: scheme,
      seededKey: LS_SAMPLE_SEEDED,
      firstRunKey: LS_FIRST_RUN_DISMISSED,
    },
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    (expected) => document.documentElement.dataset.colorScheme === expected,
    scheme,
    { timeout: 30_000 },
  );
  await page.waitForSelector(".toolbar-title-text", { timeout: 60_000 });
  await waitForSampleMembers(page);
  await dismissFirstRunCard(page);
  await page.locator(".sidebar-row.task").first().click();
  await assertToolbarNoInlineShortcuts(page);
  await page.waitForTimeout(200);
}

async function waitForSampleMembers(page) {
  await page.waitForFunction(
    () => {
      const bar = document.querySelector(".status-bar");
      if (!bar?.textContent?.includes("sample-team")) return false;
      if (document.body.textContent?.includes("一覧に無い担当")) return false;
      const sidebar = document.querySelector(".sidebar");
      return sidebar?.textContent?.includes("田中") ?? false;
    },
    undefined,
    { timeout: 60_000 },
  );
}

async function dismissFirstRunCard(page) {
  const close = page.locator(".first-run-hint-card .modal-close-btn");
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await page.waitForSelector(".first-run-hint-card", { state: "detached", timeout: 5000 }).catch(() => {});
  }
}

async function assertToolbarNoInlineShortcuts(page) {
  await page.waitForFunction(() => {
    const row = document.querySelector(".toolbar-row-actions");
    if (!row) return false;
    const chips = row.querySelectorAll(".menu-shortcut");
    for (const chip of chips) {
      if (getComputedStyle(chip).display !== "none") return false;
    }
    const buttons = [...row.querySelectorAll("button")];
    for (const btn of buttons) {
      const t = btn.textContent ?? "";
      if (/Ctrl\+|⌘|Delete|Insert|Alt\+Shift/.test(t)) return false;
    }
    return true;
  });
}

async function openTaskContextMenuForCapture(page) {
  const task = page
    .locator(".sidebar-row.task:not(.sidebar-row--explanation-trial)")
    .first();
  await task.click();
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    window.__manualScreenshotOpenTaskContextMenu?.();
  });
  await page.waitForSelector(".context-menu", { timeout: 10_000 });
}

async function assertContextShortcutInset(page) {
  await page.waitForFunction(() => {
    const item = [...document.querySelectorAll(".context-menu button")].find((b) =>
      b.textContent?.includes("複製"),
    );
    const sc = item?.querySelector(".menu-shortcut");
    if (!item || !sc) return false;
    const btn = item.getBoundingClientRect();
    const sr = sc.getBoundingClientRect();
    const insetRightBtn = btn.right - sr.right;
    const padRight = parseFloat(getComputedStyle(item).paddingRight);
    if (!(sr.width > 0) || sr.right > btn.right + 0.5) return false;
    return Math.abs(insetRightBtn - padRight) < 2;
  });
}

async function save2xCrop(page, selector, outPath) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`missing box: ${selector}`);
  const shot = await page.screenshot({ type: "png" });
  const meta = await sharp(shot).metadata();
  const w = meta.width ?? 1440;
  const h = meta.height ?? 900;
  const left = Math.max(0, Math.floor(box.x));
  const top = Math.max(0, Math.floor(box.y));
  const width = Math.min(w - left, Math.ceil(box.width));
  const height = Math.min(h - top, Math.ceil(box.height));
  await sharp(shot)
    .extract({ left, top, width, height })
    .resize(width * 2, height * 2, { kernel: sharp.kernel.nearest })
    .png()
    .toFile(outPath);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "menu-473-capture-head.txt"),
    `${HEAD}\n`,
    "utf8",
  );
  const viteCache = path.join(root, "node_modules", ".vite");
  if (fs.existsSync(viteCache)) {
    fs.rmSync(viteCache, { recursive: true, force: true });
  }
  spawnSync("node", ["scripts/compile-validators.mjs"], {
    cwd: root,
    stdio: "inherit",
  });

  killPort(port);
  const vite = spawn(
    "npm",
    ["run", "dev:manual-screenshot", "--", "--host", "127.0.0.1", "--port", String(port)],
    { cwd: root, stdio: "ignore", detached: true },
  );
  vite.unref();
  try {
    await waitForServer(`http://127.0.0.1:${port}/`);
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.addInitScript(({ seededKey, firstRunKey }) => {
      localStorage.removeItem(seededKey);
      localStorage.setItem(firstRunKey, "1");
    }, { seededKey: LS_SAMPLE_SEEDED, firstRunKey: LS_FIRST_RUN_DISMISSED });
    const page = await context.newPage();
    const written = [];

    for (const scheme of ["light", "dark"]) {
      await applyColorScheme(page, scheme);

      const toolbarPath = path.join(outDir, `menu-473-toolbar-selected-${scheme}.png`);
      await page.locator(".toolbar-row-actions").screenshot({ path: toolbarPath });
      await save2xCrop(
        page,
        ".toolbar-row-actions",
        path.join(outDir, `menu-473-toolbar-selected-${scheme}-2x.png`),
      );
      written.push(toolbarPath);

      const selectedTask = page.locator(".sidebar-row.task.selected").first();
      const target =
        (await selectedTask.count()) > 0
          ? selectedTask
          : page.locator(".sidebar-row.task:not(.sidebar-row--explanation-trial)").first();
      await target.click({ button: "right" }).catch(() => {});
      if ((await page.locator(".context-menu").count()) === 0) {
        await openTaskContextMenuForCapture(page);
      }
      await page.waitForSelector(".context-menu", { timeout: 10_000 });
      await assertContextShortcutInset(page);
      const ctxPath = path.join(outDir, `menu-473-context-menu-${scheme}.png`);
      await page.locator(".context-menu").screenshot({ path: ctxPath });
      await save2xCrop(
        page,
        ".context-menu",
        path.join(outDir, `menu-473-context-menu-${scheme}-2x.png`),
      );
      written.push(ctxPath);
      await page.keyboard.press("Escape");

      await page.locator(".shortcuts-btn").click();
      await page.waitForSelector(".shortcuts-table--mode", { timeout: 10_000 });
      const shortcutsPath = path.join(
        outDir,
        `menu-473-shortcuts-dialog-${scheme}.png`,
      );
      await page.locator(".ui-dialog-panel.shortcuts-modal").screenshot({
        path: shortcutsPath,
      });
      await save2xCrop(
        page,
        ".ui-dialog-panel.shortcuts-modal",
        path.join(outDir, `menu-473-shortcuts-dialog-${scheme}-2x.png`),
      );
      written.push(shortcutsPath);
      await page.keyboard.press("Escape");
    }

    await browser.close();
    console.log("HEAD", HEAD);
    for (const f of written) console.log(f);
  } finally {
    killPort(port);
    try {
      process.kill(-vite.pid, "SIGTERM");
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
