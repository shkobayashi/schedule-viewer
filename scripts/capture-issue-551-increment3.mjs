/**
 * Issue #551 increment 3 — task detail and bulk detail panels (1440×900, auto scale).
 */
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "design", "screenshots", "issue-551");
const artifactDir = path.join("/opt/cursor/artifacts", "issue-551");
const fullSchedule = path.join(root, "examples", "regression", "full.schedule.json");
const smokeSchedule = path.join(root, "examples", "regression", "smoke.schedule.json");
const PORT = 5174;
const viewport = { width: 1440, height: 900 };
const phase = process.argv.includes("--after") ? "after" : "before";
const MARGIN = 24;

function killOwnPort(port) {
  try {
    spawnSync("fuser", ["-k", `${port}/tcp`], { stdio: "ignore" });
  } catch {
    // best effort
  }
}

function portBusy(port) {
  try {
    const r = spawnSync("fuser", [`${port}/tcp`], { encoding: "utf8" });
    return (r.stdout || "").trim().length > 0;
  } catch {
    return false;
  }
}

function waitForServer(serverPort, timeoutMs = 120_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://localhost:${serverPort}/`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Server on ${serverPort} did not start`));
          return;
        }
        setTimeout(tick, 400);
      });
    };
    tick();
  });
}

async function compileValidators() {
  await new Promise((resolve, reject) => {
    const child = spawn("node", ["scripts/compile-validators.mjs"], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("compile-validators failed"))));
  });
}

function startVite() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["vite", "--port", String(PORT), "--strictPort", "--mode", "manual-screenshot"],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env } },
    );
    child.on("exit", (code) => {
      if (code !== 0 && code !== null) reject(new Error(`Vite exited ${code}`));
    });
    resolve(child);
  });
}

async function dismissBlockingUi(page) {
  const closeGuide = page.getByRole("button", { name: "閉じる" });
  if (await closeGuide.isVisible().catch(() => false)) await closeGuide.click();
}

async function applyOpen(page, filePath) {
  await page.waitForFunction(
    () => typeof window.__manualScreenshotApplyOpen === "function",
    null,
    { timeout: 60_000 },
  );
  const contents = fs.readFileSync(filePath, "utf8");
  const mockPath = `/Users/example/Documents/${path.basename(filePath)}`;
  await page.evaluate(
    async ({ mockPath, contents }) => {
      await window.__manualScreenshotApplyOpen?.({ path: mockPath, contents });
    },
    { mockPath, contents },
  );
}

async function prepareColorScheme(page, colorScheme) {
  await page.evaluate((scheme) => {
    localStorage.setItem("schedule-viewer/color-scheme", scheme);
    localStorage.setItem("schedule-viewer/display-scale", "auto");
  }, colorScheme);
  await page.reload({ waitUntil: "networkidle" });
  if (colorScheme === "dark") {
    await page.waitForFunction(
      () => document.documentElement.dataset.colorScheme === "dark",
      null,
      { timeout: 30_000 },
    );
  }
  await page.waitForFunction(
    () => getComputedStyle(document.documentElement).getPropertyValue("--s").trim() === "1.15",
    null,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(400);
}

async function preparePage(page, colorScheme) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
  await page.setViewportSize(viewport);
  await prepareColorScheme(page, colorScheme);
  await dismissBlockingUi(page);
}

async function shotPanelMargin(page, panelLocator, filePath) {
  const box = await panelLocator.boundingBox();
  if (!box) throw new Error("detail panel bounding box missing");
  await page.screenshot({
    path: filePath,
    clip: {
      x: Math.max(0, box.x - MARGIN),
      y: Math.max(0, box.y - MARGIN),
      width: box.width + MARGIN * 2,
      height: Math.min(viewport.height, box.height + MARGIN * 2),
    },
  });
}

/** Clip around an anchor inside the panel after scrolling it into view (proves footer/todo reachability). */
async function shotPanelAnchor(
  page,
  panelLocator,
  anchorLocator,
  filePath,
  { extraAbove = 48, extraBelow = 56 } = {},
) {
  const panel = panelLocator.first();
  await anchorLocator.scrollIntoViewIfNeeded();
  await panel.evaluate((el) => {
    el.scrollTop = Math.min(
      el.scrollTop,
      Math.max(0, el.scrollHeight - el.clientHeight),
    );
  });
  await anchorLocator.evaluate((node) => {
    node.scrollIntoView({ block: "center", behavior: "instant" });
  });
  await page.waitForTimeout(300);
  const panelBox = await panel.boundingBox();
  const anchorBox = await anchorLocator.boundingBox();
  if (!panelBox || !anchorBox) throw new Error("panel or anchor bounding box missing");
  const y0 = Math.max(0, anchorBox.y - extraAbove - MARGIN);
  const y1 = Math.min(viewport.height, anchorBox.y + anchorBox.height + extraBelow + MARGIN);
  await page.screenshot({
    path: filePath,
    clip: {
      x: Math.max(0, panelBox.x - MARGIN),
      y: y0,
      width: Math.min(viewport.width, panelBox.width + MARGIN * 2),
      height: Math.max(1, y1 - y0),
    },
  });
}

async function measureAnchorInPanel(page, panelSelector, anchorSelector) {
  return page.evaluate(
    ({ panelSelector, anchorSelector }) => {
      const panel = document.querySelector(panelSelector);
      const anchor = document.querySelector(anchorSelector);
      if (!(anchor instanceof HTMLElement)) {
        return { anchorFound: false };
      }
      const panelRect = panel?.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const panelTop = panelRect?.top ?? 0;
      const panelBottom = panelRect?.bottom ?? window.innerHeight;
      const fullyInPanel =
        anchorRect.top >= panelTop - 1 && anchorRect.bottom <= panelBottom + 1;
      const fullyInViewport =
        anchorRect.top >= 0 && anchorRect.bottom <= window.innerHeight;
      return {
        anchorFound: true,
        anchorSelector,
        panelScrollTop: panel instanceof HTMLElement ? panel.scrollTop : null,
        panelClientHeight: panel instanceof HTMLElement ? panel.clientHeight : null,
        anchorLabel: anchor.getAttribute("aria-label") ?? anchor.textContent?.trim().slice(0, 40) ?? "",
        fullyInPanel,
        fullyInViewport,
        anchorTop: anchorRect.top,
        anchorBottom: anchorRect.bottom,
        panelTop,
        panelBottom,
        disabled: anchor instanceof HTMLButtonElement ? anchor.disabled : null,
      };
    },
    { panelSelector, anchorSelector },
  );
}

async function measureInputs(page) {
  return page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        height: cs.height,
        lineHeight: cs.lineHeight,
        fontSize: cs.fontSize,
        backgroundColor: cs.backgroundColor,
        className: el.className,
      };
    };
    return {
      s: rootStyle.getPropertyValue("--s").trim(),
      panel: pick(".detail-panel"),
      name: pick("#detailName"),
      note: pick("#detailNote"),
      status: pick("#detailStatus"),
      start: pick("#detailStart"),
      progressRange: pick("#detailProgress[type='range']"),
      progressNum: pick(".detail-progress-num"),
      todoText: pick(".detail-todo-text"),
      bulkApply: pick(".detail-bulk-actions button"),
    };
  });
}

async function captureTaskDetail(page, scheme) {
  await preparePage(page, scheme);
  await applyOpen(page, fullSchedule);
  await page.waitForSelector(".toolbar-title-text", { timeout: 60_000 });
  await page.getByText("やること付き", { exact: true }).first().click();
  await page.locator('[aria-label="タスクの詳細"]').waitFor({ state: "visible" });
  await page.locator("#detailName").waitFor();
  await page.waitForTimeout(400);
  const panel = page.locator('[aria-label="タスクの詳細"]');
  const metrics = await measureInputs(page);
  const file = path.join(outDir, `increment3-${phase}-${scheme}-task-detail.png`);
  await shotPanelMargin(page, panel, file);
  const todoAnchor = page.locator(".detail-todo-text").first();
  await todoAnchor.waitFor({ state: "visible" });
  const todoFile = path.join(outDir, `increment3-${phase}-${scheme}-task-detail-todo.png`);
  await shotPanelAnchor(page, panel, todoAnchor, todoFile, {
    extraAbove: 72,
    extraBelow: 40,
  });
  const todoVisibility = await measureAnchorInPanel(
    page,
    '[aria-label="タスクの詳細"]',
    ".detail-todo-text",
  );
  return {
    case: "task-detail",
    scheme,
    metrics,
    file,
    supplements: [
      {
        case: "task-detail-todo",
        file: todoFile,
        visibility: todoVisibility,
      },
    ],
  };
}

async function captureBulkDetail(page, scheme) {
  await preparePage(page, scheme);
  await applyOpen(page, smokeSchedule);
  await page.waitForSelector(".toolbar-title-text", { timeout: 60_000 });
  const survey = page.getByText("調査", { exact: true }).first();
  const design = page.getByText("設計", { exact: true }).first();
  await survey.click();
  await design.click({ modifiers: ["Control"] });
  await page.locator('[aria-label$="件の一括編集"]').waitFor({ state: "visible" });
  await page.waitForTimeout(400);
  const panel = page.locator(".detail-panel-bulk");
  const metrics = await measureInputs(page);
  const file = path.join(outDir, `increment3-${phase}-${scheme}-bulk-detail.png`);
  await shotPanelMargin(page, panel, file);
  const bulkStatus = page.getByLabel("ステータス", { exact: true });
  await bulkStatus.selectOption("done");
  await page.getByText(/適用する項目:.*ステータス/).waitFor({ state: "visible" });
  const applyBtn = page.getByRole("button", { name: /件に適用/ });
  await expectApplyEnabled(page, applyBtn);
  const applyFile = path.join(outDir, `increment3-${phase}-${scheme}-bulk-detail-apply.png`);
  await shotPanelAnchor(page, panel, applyBtn, applyFile, {
    extraAbove: 80,
    extraBelow: 32,
  });
  const applyVisibility = await measureAnchorInPanel(
    page,
    ".detail-panel-bulk",
    ".detail-bulk-actions button",
  );
  return {
    case: "bulk-detail",
    scheme,
    metrics,
    file,
    supplements: [
      {
        case: "bulk-detail-apply",
        file: applyFile,
        visibility: applyVisibility,
        draftPreview: await page
          .locator(".detail-bulk-apply-preview")
          .first()
          .innerText()
          .catch(() => null),
      },
    ],
  };
}

async function expectApplyEnabled(page, applyBtn) {
  await page.waitForFunction(
    (locator) => {
      const buttons = [...document.querySelectorAll(".detail-bulk-actions button")];
      const apply = buttons.find((b) => /件に適用/.test(b.textContent ?? ""));
      return apply instanceof HTMLButtonElement && !apply.disabled;
    },
    null,
    { timeout: 10_000 },
  );
  await applyBtn.waitFor({ state: "visible" });
}

async function verifyBulkApplyPersists(page) {
  await preparePage(page, "light");
  await applyOpen(page, smokeSchedule);
  await page.waitForSelector(".toolbar-title-text", { timeout: 60_000 });
  await page.getByText("調査", { exact: true }).first().click();
  await page.getByText("設計", { exact: true }).first().click({ modifiers: ["Control"] });
  await page.locator('[aria-label$="件の一括編集"]').waitFor({ state: "visible" });
  await page.getByLabel("ステータス", { exact: true }).selectOption("done");
  const applyBtn = page.getByRole("button", { name: /2件に適用/ });
  await expectApplyEnabled(page, applyBtn);
  await applyBtn.click();
  await page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll(".detail-bulk-actions button")];
    const apply = buttons.find((b) => /件に適用/.test(b.textContent ?? ""));
    return apply instanceof HTMLButtonElement && apply.disabled;
  });
  await page.getByText("調査", { exact: true }).first().click();
  await page.waitForFunction(() => {
    const status = document.querySelector(
      '[aria-label="タスクの詳細"] #detailStatus',
    );
    return status instanceof HTMLSelectElement && status.value === "done";
  });
  await page.getByText("設計", { exact: true }).first().click();
  await page.waitForFunction(() => {
    const status = document.querySelector(
      '[aria-label="タスクの詳細"] #detailStatus',
    );
    return status instanceof HTMLSelectElement && status.value === "done";
  });
  return {
    verifiedAt: new Date().toISOString(),
    surveyDetailStatus: "done",
    designDetailStatus: "done",
  };
}

async function main() {
  if (portBusy(PORT)) {
    console.error(`Port ${PORT} is in use; not killing foreign processes.`);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(artifactDir, { recursive: true });
  killOwnPort(PORT);
  await new Promise((r) => setTimeout(r, 500));
  await compileValidators();
  const vite = await startVite();
  const results = { phase, viewport, marginPx: MARGIN, capturedAt: new Date().toISOString(), captures: [] };
  try {
    await waitForServer(PORT);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    for (const scheme of ["light", "dark"]) {
      results.captures.push(await captureTaskDetail(page, scheme));
      results.captures.push(await captureBulkDetail(page, scheme));
    }
    if (phase === "after") {
      results.bulkApplyVerification = await verifyBulkApplyPersists(page);
    }
    await browser.close();
  } finally {
    vite.kill("SIGTERM");
    killOwnPort(PORT);
  }
  const metricsPath = path.join(outDir, `increment3-${phase}-metrics.json`);
  fs.writeFileSync(metricsPath, `${JSON.stringify(results, null, 2)}\n`);
  for (const name of fs.readdirSync(outDir)) {
    if (name.startsWith("increment3-") && (name.endsWith(".png") || name.endsWith(".json"))) {
      fs.copyFileSync(path.join(outDir, name), path.join(artifactDir, name));
    }
  }
  console.log(`Wrote increment3 ${phase} artifacts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
