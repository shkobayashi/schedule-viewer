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

async function prepareShortcutsDialogForCapture(page) {
  await page.evaluate(() => {
    const panel = document.querySelector(".ui-dialog-panel.shortcuts-modal");
    const body = document.querySelector(".shortcuts-modal-body");
    const block = document.querySelector("#shortcuts-mode-capture");
    if (panel instanceof HTMLElement) {
      panel.style.maxHeight = "none";
      panel.style.overflow = "visible";
      panel.style.height = "auto";
    }
    if (body instanceof HTMLElement) {
      body.style.overflow = "visible";
      body.style.maxHeight = "none";
      body.style.flex = "0 0 auto";
      body.style.height = "auto";
      body.scrollTop = 0;
    }
    if (block instanceof HTMLElement) {
      block.style.overflow = "visible";
      block.style.height = "auto";
    }
  });
  await page.waitForTimeout(200);
}

async function assertPngNotBlank(filePath, minBytes = 4000) {
  const stat = fs.statSync(filePath);
  if (stat.size < minBytes) {
    throw new Error(`${filePath} too small (${stat.size} bytes)`);
  }
  const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const v = data[i] ?? 0;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  if (max - min < 30) {
    throw new Error(`${filePath} looks blank (luma range ${min}-${max})`);
  }
}

async function scrollShortcutsModeSectionIntoView(page) {
  await page.evaluate(() => {
    const body = document.querySelector(".shortcuts-modal-body");
    const block = document.querySelector("#shortcuts-mode-capture");
    if (!body || !block) return;
    body.scrollTop = 0;
    const bodyTop = body.getBoundingClientRect().top;
    const blockTop = block.getBoundingClientRect().top;
    body.scrollTop += blockTop - bodyTop - 4;
  });
  await page.waitForTimeout(200);
}

async function assertModeTableKeyColumnsReadable(page) {
  await page.waitForFunction(() => {
    const table = document.querySelector(".shortcuts-table--mode");
    if (!table) return false;
    const headCells = [...table.querySelectorAll("thead th")];
    if (headCells.length !== 5) return false;
    const keyHeaders = headCells.slice(1);
    const expected = ["Esc", "Enter", "Tab", "矢印"];
    for (let i = 0; i < expected.length; i += 1) {
      if ((keyHeaders[i]?.textContent?.trim() ?? "") !== expected[i]) return false;
    }
    for (const cell of keyHeaders) {
      const r = cell.getBoundingClientRect();
      if (r.width < 32) return false;
    }
    const bodyRows = table.querySelectorAll("tbody tr");
    if (bodyRows.length < 3) return false;
    const sample = table.querySelector("tbody td:nth-child(5)");
    if (!sample) return false;
    return sample.getBoundingClientRect().width >= 32;
  });
}

async function save2xElementScreenshot(page, selector, outPath) {
  const shot = await page.locator(selector).screenshot({ type: "png" });
  const meta = await sharp(shot).metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;
  await sharp(shot)
    .resize(width * 2, height * 2, { kernel: sharp.kernel.nearest })
    .png()
    .toFile(outPath);
}

async function layoutShortcutsModeBlockForCapture(page) {
  await prepareShortcutsDialogForCapture(page);
  await page.evaluate(() => {
    const overlay = document.querySelector(
      '.ui-dialog-overlay[role="dialog"]:has(#shortcuts-mode-capture)',
    );
    const panel = document.querySelector(".ui-dialog-panel.shortcuts-modal");
    const body = document.querySelector(".shortcuts-modal-body");
    const block = document.querySelector("#shortcuts-mode-capture");
    if (overlay instanceof HTMLElement) {
      overlay.style.alignItems = "flex-start";
      overlay.style.justifyContent = "center";
      overlay.style.paddingTop = "16px";
    }
    if (panel instanceof HTMLElement) {
      panel.style.position = "relative";
      panel.style.top = "0";
      panel.style.transform = "none";
      panel.style.maxHeight = "none";
      panel.style.height = "auto";
      panel.style.overflow = "visible";
    }
    if (body instanceof HTMLElement) {
      for (const child of body.children) {
        if (child instanceof HTMLElement && child !== block) {
          child.style.display = "none";
        }
      }
    }
    if (block instanceof HTMLElement) {
      block.style.height = "auto";
      block.style.overflow = "visible";
    }
    const header = panel?.querySelector(".ui-dialog-header");
    if (header instanceof HTMLElement) {
      header.style.display = "none";
    }
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.waitForTimeout(120);
}

async function captureShortcutsModeTable(page, scheme, written) {
  await page.waitForFunction(
    () =>
      (document.querySelectorAll(".shortcuts-table--mode tbody tr").length ?? 0) >= 6,
  );
  await page.waitForFunction(() => {
    const block = document.querySelector("#shortcuts-mode-capture");
    const text = block?.textContent ?? "";
    return (
      text.includes("絞り込みパネル") &&
      text.includes("線を引くモード") &&
      text.includes("タスク詳細パネル")
    );
  });
  await assertModeTableKeyColumnsReadable(page);
  await layoutShortcutsModeBlockForCapture(page);
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll(".shortcuts-table--mode tbody tr");
    if (rows.length < 6) return false;
    const notes = document.querySelectorAll(".shortcuts-mode-notes li");
    if (notes.length < 6) return false;
    const last = rows[rows.length - 1];
    const block = document.querySelector("#shortcuts-mode-capture");
    if (!last || !block) return false;
    const lastBox = last.getBoundingClientRect();
    const blockBox = block.getBoundingClientRect();
    const vh = window.innerHeight;
    return lastBox.bottom <= vh - 8 && blockBox.top >= 0;
  });
  const locator = page.locator("#shortcuts-mode-capture");
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const modePath = path.join(outDir, `menu-473-shortcuts-mode-table-${scheme}.png`);
  const mode2x = path.join(outDir, `menu-473-shortcuts-mode-table-${scheme}-2x.png`);
  const shot = await locator.screenshot({ type: "png" });
  await sharp(shot).png().toFile(modePath);
  const meta = await sharp(shot).metadata();
  if ((meta.height ?? 0) < 380) {
    throw new Error(
      `mode table capture too short (${meta.height}px); expected all 6 rows and notes`,
    );
  }
  if ((meta.height ?? 0) < 420) {
    throw new Error(
      `mode table capture height ${meta.height}px; expected full 6 rows and notes`,
    );
  }
  await assertPngNotBlank(modePath, 8000);
  await sharp(shot)
    .resize((meta.width ?? 1) * 2, (meta.height ?? 1) * 2, {
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toFile(mode2x);
  await assertPngNotBlank(mode2x, 20_000);
  written.push(modePath);
}

async function captureShortcutsDialogBothSections(page, scheme, written) {
  const selector = ".ui-dialog-panel.shortcuts-modal";
  const shortcutsPath = path.join(outDir, `menu-473-shortcuts-dialog-${scheme}.png`);
  await captureRegionScreenshot(
    page,
    selector,
    shortcutsPath,
    path.join(outDir, `menu-473-shortcuts-dialog-${scheme}-2x.png`),
  );
  written.push(shortcutsPath);
}

async function captureRegionLocator(page, locator, outPath, out2xPath) {
  const box = await locator.boundingBox();
  if (!box || box.width < 8 || box.height < 8) {
    throw new Error("missing region box for locator");
  }
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
    .png()
    .toFile(outPath);
  await assertPngNotBlank(outPath);
  await sharp(shot)
    .extract({ left, top, width, height })
    .resize(width * 2, height * 2, { kernel: sharp.kernel.nearest })
    .png()
    .toFile(out2xPath);
  await assertPngNotBlank(out2xPath, 15_000);
}

async function captureRegionScreenshot(page, selector, outPath, out2xPath) {
  await captureRegionLocator(page, page.locator(selector).first(), outPath, out2xPath);
}

function hamburgerMenuPanel(page) {
  return page
    .getByRole("menu")
    .filter({ has: page.getByRole("menuitem", { name: "開く" }) })
    .first();
}

async function captureAppMenu(page, scheme, written) {
  await page.locator(".menu-btn").click();
  const panel = hamburgerMenuPanel(page);
  await panel.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(200);
  const menuPath = path.join(outDir, `menu-473-hamburger-menu-${scheme}.png`);
  await captureRegionLocator(
    page,
    panel,
    menuPath,
    path.join(outDir, `menu-473-hamburger-menu-${scheme}-2x.png`),
  );
  written.push(menuPath);
  await page.keyboard.press("Escape");
}

async function captureTodayToolbarTooltip(page, scheme, written) {
  const btn = page.getByRole("button", { name: "今日", exact: true });
  const title = await btn.getAttribute("title");
  if (!title || !/（T）|\(T\)/.test(title)) {
    throw new Error(`today title missing (T): ${title ?? "null"}`);
  }
  const box = await btn.boundingBox();
  if (!box) throw new Error("today button box missing");
  const tipTop = box.y + box.height + 14;
  await page.evaluate(
    ({ text, left, top, width }) => {
      document.getElementById("capture-tooltip-mirror")?.remove();
      const tip = document.createElement("div");
      tip.id = "capture-tooltip-mirror";
      tip.textContent = text;
      Object.assign(tip.style, {
        position: "fixed",
        left: `${left}px`,
        top: `${top}px`,
        maxWidth: `${Math.max(width, 280)}px`,
        padding: "6px 10px",
        background: "CanvasText",
        color: "Canvas",
        font: "12px system-ui, sans-serif",
        borderRadius: "4px",
        zIndex: "99999",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        pointerEvents: "none",
      });
      document.body.appendChild(tip);
    },
    { text: title, left: box.x, top: tipTop, width: box.width },
  );
  await page.waitForTimeout(80);
  const clip = {
    x: Math.max(0, box.x - 24),
    y: Math.max(0, box.y - 6),
    width: Math.min(1440 - Math.max(0, box.x - 24), box.width + 300),
    height: box.height + 14 + 44 + 16,
  };
  const tipPath = path.join(outDir, `menu-473-toolbar-today-tooltip-${scheme}.png`);
  const shot = await page.screenshot({ type: "png", clip });
  await sharp(shot).png().toFile(tipPath);
  await assertPngNotBlank(tipPath, 4000);
  const meta = await sharp(shot).metadata();
  await sharp(shot)
    .resize((meta.width ?? 1) * 2, (meta.height ?? 1) * 2, {
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toFile(path.join(outDir, `menu-473-toolbar-today-tooltip-${scheme}-2x.png`));
  await page.evaluate(() => document.getElementById("capture-tooltip-mirror")?.remove());
  written.push(tipPath);
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

      await captureAppMenu(page, scheme, written);

      await captureTodayToolbarTooltip(page, scheme, written);

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
      await prepareShortcutsDialogForCapture(page);
      await captureShortcutsDialogBothSections(page, scheme, written);
      await captureShortcutsModeTable(page, scheme, written);
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
