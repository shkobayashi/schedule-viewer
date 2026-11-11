/**
 * Issue #551 increment 4 — explanation overlay (manual-screenshot hook), 1440×900, auto scale.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "design", "screenshots", "issue-551");
const artifactDir = path.join("/opt/cursor/artifacts", "issue-551");
const playgroundSchedule = path.join(root, "examples", "playground.schedule.json");
const PORT = 5174;
const viewport = { width: 1440, height: 900 };
const phase = process.argv.includes("--after") ? "after" : "before";

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

async function captureExplainOverlay(page, scheme) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
  await page.setViewportSize(viewport);
  await prepareColorScheme(page, scheme);
  await dismissBlockingUi(page);
  await applyOpen(page, playgroundSchedule);
  await page.waitForSelector(".toolbar-title-text", { timeout: 60_000 });
  await page.waitForTimeout(400);
  const canShow = await page.evaluate(
    () => typeof window.__manualScreenshotShowExplainOverlay === "function",
  );
  if (!canShow) throw new Error("manual-screenshot explain overlay hook missing");
  await page.evaluate(() => window.__manualScreenshotShowExplainOverlay?.());
  await page.waitForSelector(".explanation-sidebar-veil", { timeout: 15_000 });
  await page.waitForFunction(
    () => {
      const text = document.querySelector(".explanation-banner-summary")?.textContent?.trim();
      return Boolean(text);
    },
    null,
    { timeout: 15_000 },
  );
  const file = path.join(outDir, `increment4-${phase}-${scheme}-explain-overlay.png`);
  await page.screenshot({ path: file, fullPage: false });
  const metrics = await page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const summaryText =
      document.querySelector(".explanation-banner-summary")?.textContent?.trim() ?? "";
    return {
      s: rootStyle.getPropertyValue("--s").trim(),
      borderWidthFocus: rootStyle.getPropertyValue("--border-width-focus").trim(),
      veilVisible: document.querySelector(".explanation-sidebar-veil") != null,
      summaryText,
    };
  });
  if (!metrics.summaryText) {
    throw new Error("summaryText empty after overlay settle");
  }
  return { case: "explain-overlay", scheme, metrics, file };
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
  const results = {
    phase,
    viewport,
    capturedAt: new Date().toISOString(),
    captures: [],
    note: "Fixture marks use explanationMarkHaloStroke when color is set; hook demo marks include color but halo is validated via tests, not this crop.",
  };
  try {
    await waitForServer(PORT);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    for (const scheme of ["light", "dark"]) {
      results.captures.push(await captureExplainOverlay(page, scheme));
    }
    await browser.close();
  } finally {
    vite.kill("SIGTERM");
    killOwnPort(PORT);
  }
  const metricsPath = path.join(outDir, `increment4-${phase}-metrics.json`);
  fs.writeFileSync(metricsPath, `${JSON.stringify(results, null, 2)}\n`);
  for (const name of fs.readdirSync(outDir)) {
    if (name.startsWith("increment4-") && (name.endsWith(".png") || name.endsWith(".json"))) {
      fs.copyFileSync(path.join(outDir, name), path.join(artifactDir, name));
    }
  }
  console.log(`Wrote increment4 ${phase} artifacts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
