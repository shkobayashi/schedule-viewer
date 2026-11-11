/**
 * Issue #551 — command palette light/dark evidence (viewport 1440×900, display scale auto).
 * Output: docs/design/screenshots/issue-551/
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

function killPort(port) {
  try {
    spawnSync("fuser", ["-k", `${port}/tcp`], { stdio: "ignore" });
  } catch {
    // best effort
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
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error("compile-validators failed"));
    });
  });
}

function startVite() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["vite", "--port", String(PORT), "--strictPort", "--mode", "manual-screenshot"],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env } },
    );
    let failed = false;
    const onErr = (chunk) => {
      const text = chunk.toString();
      process.stderr.write(text);
      if (text.includes("already in use")) {
        failed = true;
        reject(new Error(`Vite failed: port ${PORT} in use`));
        child.kill("SIGTERM");
      }
    };
    child.stdout?.on("data", (c) => process.stdout.write(c));
    child.stderr?.on("data", onErr);
    child.on("exit", (code) => {
      if (!failed && code !== 0 && code !== null) {
        reject(new Error(`Vite exited ${code}`));
      }
    });
    resolve(child);
  });
}

async function dismissBlockingUi(page) {
  const closeGuide = page.getByRole("button", { name: "閉じる" });
  if (await closeGuide.isVisible().catch(() => false)) {
    await closeGuide.click();
  }
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

async function prepareMain(page, colorScheme) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
  await page.setViewportSize(viewport);
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
  await dismissBlockingUi(page);
  await applyOpen(page, playgroundSchedule);
  await page.waitForSelector(".toolbar-title-text", {
    hasText: "playground",
    timeout: 60_000,
  });
  await page.waitForFunction(
    () => {
      const s = getComputedStyle(document.documentElement).getPropertyValue("--s").trim();
      return s !== "" && s !== "1";
    },
    null,
    { timeout: 15_000 },
  ).catch(() => {
    // fallback: allow fixed scale runs
  });
  await page.waitForTimeout(500);
}

async function openPalette(page) {
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.down(mod);
  await page.keyboard.press("KeyK");
  await page.keyboard.up(mod);
  await page.locator(".command-palette-input").waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForSelector(".command-palette-list [role='option']", { timeout: 10_000 });
  const optionCount = await page.locator(".command-palette-list [role='option']").count();
  if (optionCount < 5) {
    throw new Error(`Expected multiple palette options, got ${optionCount}`);
  }
  await page.waitForTimeout(300);
}

async function readMetrics(page) {
  return page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const s = rootStyle.getPropertyValue("--s").trim();
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        paddingTop: cs.paddingTop,
        paddingRight: cs.paddingRight,
        paddingBottom: cs.paddingBottom,
        paddingLeft: cs.paddingLeft,
        marginBottom: cs.marginBottom,
        gap: cs.gap,
        borderRadius: cs.borderRadius,
        boxShadow: cs.boxShadow ? "(set)" : "",
      };
    };
    return {
      s,
      spaceSm: rootStyle.getPropertyValue("--space-sm").trim(),
      spaceMd: rootStyle.getPropertyValue("--space-md").trim(),
      radiusDialog: rootStyle.getPropertyValue("--radius-dialog").trim(),
      elevationModal: rootStyle.getPropertyValue("--elevation-modal").trim(),
      commandPalette: pick(".command-palette"),
      commandPaletteInput: pick(".command-palette-input"),
      commandPaletteItem: pick(".command-palette-item"),
    };
  });
}

async function captureScheme(page, scheme) {
  await prepareMain(page, scheme);
  await openPalette(page);
  const metrics = await readMetrics(page);
  const file = path.join(outDir, `increment1-${phase}-${scheme}-command-palette.png`);
  await page.locator(".command-palette").screenshot({ path: file });
  await page.keyboard.press("Escape");
  await page.locator(".command-palette-input").waitFor({ state: "hidden", timeout: 5_000 });
  return { scheme, metrics, file };
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(artifactDir, { recursive: true });
  killPort(PORT);
  await new Promise((r) => setTimeout(r, 800));
  await compileValidators();
  const vite = await startVite();
  const results = { phase, viewport, capturedAt: new Date().toISOString(), schemes: [] };
  try {
    await waitForServer(PORT);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    for (const scheme of ["light", "dark"]) {
      results.schemes.push(await captureScheme(page, scheme));
    }
    await browser.close();
  } finally {
    vite.kill("SIGTERM");
    killPort(PORT);
  }
  const metricsPath = path.join(outDir, `increment1-${phase}-metrics.json`);
  fs.writeFileSync(metricsPath, `${JSON.stringify(results, null, 2)}\n`);
  for (const name of fs.readdirSync(outDir)) {
    if (!name.endsWith(".png") && !name.endsWith(".json")) continue;
    fs.copyFileSync(path.join(outDir, name), path.join(artifactDir, name));
  }
  console.log(`Wrote ${outDir} (phase=${phase})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
