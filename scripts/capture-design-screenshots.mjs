import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  stitchLabeledRow,
  stitchLabeledRowFromPaths,
} from "./compose-design-comparisons.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "design", "screenshots");
const artifactDir = path.join("/opt/cursor/artifacts", "design-449");
const playgroundSchedule = path.join(root, "examples", "playground.schedule.json");
const colorsSchedule = path.join(root, "examples", "manual-colors.schedule.json");
const AFTER_PORT = 5174;
const BASELINE_PORT = 5175;
const DEFAULT_BASELINE_ROOT = path.join("/tmp", "sv-f436-baseline");
/** Active capture target — set in main() before starting Vite. */
let activePort = AFTER_PORT;
let activeViteRoot = root;
let activeValidatorsRoot = root;
let chromeVerifyMode = "none"; // "baseline" | "raycast" | "none"
const viewport = { width: 1440, height: 900 };

const DIRECTIONS = [
  { id: "", prefix: "design-baseline", label: "現状" },
  { id: "linear", prefix: "design-A-linear", label: "A Linear" },
  { id: "raycast", prefix: "design-B-raycast", label: "B Raycast" },
  { id: "compact", prefix: "design-C-compact", label: "C 高密度" },
];

/** Dark-mode previews: baseline app chrome vs B Raycast only. */
const DARK_DIRECTIONS = [
  { id: "", prefix: "design-baseline-dark", label: "現状ダーク" },
  { id: "raycast", prefix: "design-B-raycast-dark", label: "B Raycast ダーク" },
];

const captureDarkOnly = process.argv.includes("--capture-dark-only");
const capturePhase3Only = process.argv.includes("--phase3-evidence");
const capturePhase3BeforeOnly = process.argv.includes("--phase3-before-only");
const captureLegacyDirections = process.argv.includes("--legacy-directions");
const capturePhase3Full = process.argv.includes("--phase3-full");

function resolveBaselineRoot() {
  return process.env.BASELINE_ROOT
    ? path.resolve(process.env.BASELINE_ROOT)
    : DEFAULT_BASELINE_ROOT;
}

function killPort(port) {
  try {
    spawnSync("fuser", ["-k", `${port}/tcp`], { stdio: "ignore" });
  } catch {
    // fuser may be missing; best effort
  }
}

function ensureBaselineWorktree(baselineRoot) {
  const pkg = path.join(baselineRoot, "package.json");
  if (!fs.existsSync(pkg)) {
    fs.mkdirSync(path.dirname(baselineRoot), { recursive: true });
    const r = spawnSync(
      "git",
      ["worktree", "add", "--detach", baselineRoot, "origin/feature-436"],
      { cwd: root, stdio: "inherit" },
    );
    if (r.status !== 0) {
      throw new Error(`git worktree add failed for ${baselineRoot}`);
    }
  }
  spawnSync("git", ["fetch", "origin", "feature-436"], { cwd: root, stdio: "ignore" });
  spawnSync("git", ["checkout", "--detach", "origin/feature-436"], {
    cwd: baselineRoot,
    stdio: "inherit",
  });
  for (const dir of ["node_modules/.vite", "dist"]) {
    const p = path.join(baselineRoot, dir);
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
  }
}

function applyBaselineExplainHook(baselineRoot) {
  const target = path.join(baselineRoot, "src/hooks/useSchedule.ts");
  if (!fs.existsSync(target)) return;
  const src = fs.readFileSync(target, "utf8");
  if (src.includes("__manualScreenshotShowExplainOverlay")) return;
  const needle =
    "  explanationOverlayRef.current = explanationOverlay;\n  const clearExplanationSession";
  const block = `  explanationOverlayRef.current = explanationOverlay;

  useEffect(() => {
    if (import.meta.env.MODE !== "manual-screenshot") return;
    window.__manualScreenshotShowExplainOverlay = () => {
      setExplanationOverlay({
        translucent: true,
        summary: "並行案の説明（見本）",
        marks: [
          {
            taskId: "b1000001-0000-4000-8000-000000000002",
            kind: "change",
            label: "期間をずらす",
            number: 1,
            color: "#2563eb",
          },
          {
            milestoneId: "a1000001-0000-4000-8000-000000000001",
            kind: "ask",
            label: "要件確定の位置",
            number: 2,
            color: "#ca8a04",
          },
        ],
        patterns: [
          {
            id: "p-demo",
            name: "案A",
            color: "#2563eb",
            tasks: [],
            changes: [
              {
                taskId: "b1000001-0000-4000-8000-000000000002",
                start: "2026-10-08",
                end: "2026-10-18",
              },
            ],
            milestoneChanges: [],
          },
        ],
      });
    };
    return () => {
      delete window.__manualScreenshotShowExplainOverlay;
    };
  }, []);

  const clearExplanationSession`;
  if (!src.includes(needle)) {
    throw new Error("baseline useSchedule.ts: cannot inject explain hook");
  }
  fs.writeFileSync(target, src.replace(needle, block));
}

async function verifyServedChrome(page, mode) {
  const probe = await page.evaluate(() => {
    const hrefs = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map((l) => l.href)
      .join(" ");
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim()
      .toLowerCase();
    const toolbarToken = getComputedStyle(document.documentElement)
      .getPropertyValue("--toolbar-bg")
      .trim();
    const toolbar = document.querySelector(".toolbar");
    const toolbarBg = toolbar
      ? getComputedStyle(toolbar).backgroundColor
      : "";
    const toolbarMarginTop = toolbar
      ? getComputedStyle(toolbar).marginTop
      : "";
    const scripts = [...document.querySelectorAll("script[type='module']")]
      .map((s) => s.src)
      .join(" ");
    return {
      hrefs,
      accent,
      toolbarToken,
      toolbarBg,
      toolbarMarginTop,
      scripts,
    };
  });

  const hasAppChrome =
    probe.hrefs.includes("appChrome") || probe.scripts.includes("appChrome");
  const coralAccent =
    probe.accent.includes("ff6363") || probe.accent.includes("255, 99, 99");
  const raycastToolbar =
    probe.toolbarToken !== "" ||
    probe.toolbarBg === "rgb(26, 26, 26)" ||
    probe.toolbarBg === "rgb(42, 43, 51)" ||
    (probe.toolbarMarginTop !== "0px" &&
      probe.toolbarMarginTop !== "" &&
      !probe.toolbarMarginTop.startsWith("0px"));

  if (mode === "baseline") {
    if (hasAppChrome) {
      throw new Error(
        "baseline capture served Raycast build (appChrome.css in page)",
      );
    }
    if (probe.toolbarToken) {
      throw new Error(
        "baseline capture served Raycast tokens (--toolbar-bg is set)",
      );
    }
    if (coralAccent) {
      throw new Error("baseline capture served Raycast accent (--accent coral)");
    }
    if (raycastToolbar && probe.toolbarBg === "rgb(26, 26, 26)") {
      throw new Error("baseline capture: floating dark toolbar detected");
    }
  }

  if (mode === "raycast") {
    if (!probe.toolbarToken && !hasAppChrome) {
      throw new Error(
        "after capture: expected Raycast chrome (--toolbar-bg or appChrome.css)",
      );
    }
    if (!coralAccent && probe.accent.includes("4c5fd5")) {
      throw new Error("after capture: old blue accent still active");
    }
  }
}

const INVENTORY_SUFFIXES = [
  "main",
  "milestone-band",
  "filter-panel",
  "settings",
  "diff-panel",
  "explain-overlay",
  "context-menu",
  "task-detail",
];

async function captureInventory(page, { namePrefix = "inventory", colorScheme = "light" } = {}) {
  const file = (suffix) => path.join(outDir, `${namePrefix}-${suffix}.png`);
  await prepareMain(page, "", colorScheme);
  if (chromeVerifyMode !== "none") {
    await verifyServedChrome(page, chromeVerifyMode);
  }
  await page.screenshot({
    path: file("main"),
  });

  await page.locator(".milestone-band").screenshot({
    path: file("milestone-band"),
  });

  await page.getByRole("button", { name: /^絞り込み/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: file("filter-panel"),
  });
  await page.keyboard.press("Escape");

  await openSettings(page);
  await page.screenshot({
    path: file("settings"),
  });
  await page.locator(".settings-dialog").getByRole("button", { name: "閉じる" }).click();
  await page.waitForTimeout(300);

  await applyOpen(page, colorsSchedule);
  await page.waitForSelector(".toolbar-title-text", {
    hasText: "操作マニュアル用の見本",
    timeout: 60_000,
  });
  await page.waitForTimeout(400);
  const progressTask = page.getByText("進行中（青）", { exact: true });
  await progressTask.click();
  await page.locator("#detailName").fill("進行中（青・差分用）");
  await page.locator("#detailName").blur();
  await page.waitForTimeout(400);
  await page.locator(".diff-strip-handle").click();
  await page.waitForFunction(() => {
    const list = document.querySelector(".diff-strip-list");
    const body = document.querySelector(".diff-strip-row-body");
    const text = `${list?.textContent ?? ""}${body?.textContent ?? ""}`;
    return text.includes("→");
  });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: file("diff-panel"),
  });
  await applyOpen(page, playgroundSchedule);
  await page.waitForSelector(".toolbar-title-text", { hasText: "playground" });
  await page.waitForTimeout(400);

  const canShowExplain = await page.evaluate(
    () => typeof window.__manualScreenshotShowExplainOverlay === "function",
  );
  if (canShowExplain) {
    await page.evaluate(() => window.__manualScreenshotShowExplainOverlay?.());
    await page.waitForSelector(".explanation-sidebar-veil", { timeout: 15_000 });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: file("explain-overlay"),
    });
  } else {
    console.warn(
      `${namePrefix}: skipping explain-overlay (manual-screenshot hook unavailable)`,
    );
  }

  const taskLabel = page.getByText("要件定義書作成", { exact: true }).first();
  await taskLabel.click({ button: "right" });
  await page.waitForSelector(".context-menu");
  await page.waitForTimeout(250);
  await page.screenshot({
    path: file("context-menu"),
  });
  await page.keyboard.press("Escape");

  await taskLabel.click();
  await page.waitForSelector('[aria-label="タスクの詳細"]');
  await page.waitForTimeout(400);
  await page.screenshot({
    path: file("task-detail"),
  });
}

async function buildPhase3Comparisons() {
  const pairs = [
    { suffix: "main", height: 720, useFromPaths: false },
    { suffix: "settings", height: 640, useFromPaths: false },
    { suffix: "explain-overlay", height: 720, useFromPaths: false },
  ];
  for (const scheme of ["light", "dark"]) {
    const beforeLabel = scheme === "light" ? "feature-436 ライト" : "feature-436 ダーク";
    const afterLabel = scheme === "light" ? "Raycast 標準 ライト" : "Raycast 標準 ダーク";
    for (const { suffix, height, useFromPaths } of pairs) {
      const beforePath = path.join(
        outDir,
        `phase3-before-${scheme}-inventory-${suffix}.png`,
      );
      const afterPath = path.join(
        outDir,
        `phase3-after-${scheme}-inventory-${suffix}.png`,
      );
      if (!fs.existsSync(beforePath) || !fs.existsSync(afterPath)) {
        console.warn(`Skip compare-phase3-${suffix}-${scheme}: missing before/after PNG`);
        continue;
      }
      const stitch = useFromPaths ? stitchLabeledRowFromPaths : stitchLabeledRow;
      await stitch(
        [beforePath, afterPath],
        [beforeLabel, afterLabel],
        path.join(outDir, `compare-phase3-${suffix}-${scheme}.png`),
        height,
      );
    }
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

async function compileValidators(validatorsRoot) {
  await new Promise((resolve, reject) => {
    const child = spawn("node", ["scripts/compile-validators.mjs"], {
      cwd: validatorsRoot,
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error("compile-validators failed"));
    });
  });
}

function startVite(viteRoot, serverPort) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "vite",
        "--port",
        String(serverPort),
        "--strictPort",
        "--mode",
        "manual-screenshot",
      ],
      { cwd: viteRoot, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env } },
    );
    let failed = false;
    const onErr = (chunk) => {
      const text = chunk.toString();
      process.stderr.write(text);
      if (text.includes("already in use")) {
        failed = true;
        reject(
          new Error(
            `Vite failed: port ${serverPort} in use (cwd ${viteRoot}). Kill the other server first.`,
          ),
        );
        child.kill("SIGTERM");
      }
    };
    child.stdout?.on("data", (c) => process.stdout.write(c));
    child.stderr?.on("data", onErr);
    child.on("exit", (code) => {
      if (!failed && code !== 0 && code !== null) {
        reject(new Error(`Vite exited ${code} in ${viteRoot}`));
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

async function prepareMain(page, query = "", colorScheme = "light") {
  const param = query.startsWith("?") ? query.slice(1) : query;
  const url = param
    ? `http://localhost:${activePort}/?${param}`
    : `http://localhost:${activePort}/`;
  await page.goto(url, {
    waitUntil: "networkidle",
  });
  await page.setViewportSize(viewport);
  await page.evaluate((scheme) => {
    localStorage.setItem("schedule-viewer/color-scheme", scheme);
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
  await page.waitForTimeout(500);
}

async function expandSidebar(page) {
  const collapsed = page.locator('button.twist[aria-expanded="false"]');
  for (let i = 0; i < 14; i += 1) {
    if ((await collapsed.count()) === 0) break;
    await collapsed.first().click();
    await page.waitForTimeout(120);
  }
}

async function showSelectionAndHover(page) {
  await expandSidebar(page);
  const selected = page.getByText("要件定義書作成", { exact: true }).first();
  await selected.click();
  await page.waitForTimeout(200);
  const hoverTarget = page.getByText("要件レビュー", { exact: true }).first();
  await hoverTarget.hover();
  await page.waitForTimeout(350);
}

async function openSettings(page) {
  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("menuitem", { name: "設定", exact: true }).click();
  await page.waitForSelector(".settings-dialog");
  await page.waitForTimeout(400);
}

async function captureDirection(page, { id, prefix }, colorScheme = "light") {
  if (id) {
    console.warn("designDirection query removed; capturing default chrome only");
  }
  await prepareMain(page, "", colorScheme);
  await showSelectionAndHover(page);
  await page.screenshot({
    path: path.join(outDir, `${prefix}-main.png`),
  });
  await page.locator(".toolbar").screenshot({
    path: path.join(outDir, `${prefix}-crop-toolbar.png`),
  });
  await page.locator(".sidebar").screenshot({
    path: path.join(outDir, `${prefix}-crop-sidebar.png`),
  });
  await openSettings(page);
  await page.screenshot({
    path: path.join(outDir, `${prefix}-settings-dialog.png`),
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}

async function buildDarkComparisons() {
  const labels = DARK_DIRECTIONS.map((d) => d.label);
  const pairs = [
    {
      suffix: "main",
      out: "compare-main-baseline-B-dark.png",
      height: 720,
      fromPaths: false,
    },
    {
      suffix: "crop-toolbar",
      out: "compare-crop-toolbar-baseline-B-dark.png",
      height: 120,
      fromPaths: true,
    },
    {
      suffix: "crop-sidebar",
      out: "compare-crop-sidebar-baseline-B-dark.png",
      height: 420,
      fromPaths: true,
    },
  ];
  for (const { suffix, out, height, fromPaths } of pairs) {
    const imagePaths = DARK_DIRECTIONS.map((d) =>
      path.join(outDir, `${d.prefix}-${suffix}.png`),
    );
    const stitch = fromPaths ? stitchLabeledRowFromPaths : stitchLabeledRow;
    await stitch(imagePaths, labels, path.join(outDir, out), height);
  }
}

async function buildComparisons() {
  const mainPaths = DIRECTIONS.map((d) =>
    path.join(outDir, `${d.prefix}-main.png`),
  );
  const settingsPaths = DIRECTIONS.map((d) =>
    path.join(outDir, `${d.prefix}-settings-dialog.png`),
  );
  const toolbarPaths = DIRECTIONS.map((d) =>
    path.join(outDir, `${d.prefix}-crop-toolbar.png`),
  );
  const sidebarPaths = DIRECTIONS.map((d) =>
    path.join(outDir, `${d.prefix}-crop-sidebar.png`),
  );
  const labels = DIRECTIONS.map((d) => d.label);

  await stitchLabeledRow(
    mainPaths,
    labels,
    path.join(outDir, "compare-main-baseline-A-B-C.png"),
    720,
  );
  await stitchLabeledRow(
    settingsPaths,
    labels,
    path.join(outDir, "compare-settings-baseline-A-B-C.png"),
    640,
  );
  await stitchLabeledRowFromPaths(
    toolbarPaths,
    labels,
    path.join(outDir, "compare-crop-toolbar-baseline-A-B-C.png"),
    120,
  );
  await stitchLabeledRowFromPaths(
    sidebarPaths,
    labels,
    path.join(outDir, "compare-crop-sidebar-baseline-A-B-C.png"),
    420,
  );
}

async function runCaptureSession(fn) {
  killPort(activePort);
  await new Promise((r) => setTimeout(r, 800));
  await compileValidators(activeValidatorsRoot);
  const vite = await startVite(activeViteRoot, activePort);
  try {
    await waitForServer(activePort);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await fn(page);
    await browser.close();
  } finally {
    vite.kill("SIGTERM");
    killPort(activePort);
  }
}

async function capturePhase3Before(page) {
  for (const scheme of ["light", "dark"]) {
    await captureInventory(page, {
      namePrefix: `phase3-before-${scheme}-inventory`,
      colorScheme: scheme,
    });
  }
}

async function capturePhase3After(page) {
  await captureInventory(page, {
    namePrefix: "phase3-after-light-inventory",
    colorScheme: "light",
  });
  await captureInventory(page, {
    namePrefix: "phase3-after-dark-inventory",
    colorScheme: "dark",
  });
  await captureInventory(page, { namePrefix: "inventory", colorScheme: "light" });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(artifactDir, { recursive: true });

  const runBefore =
    capturePhase3BeforeOnly || capturePhase3Full;
  const runAfter = capturePhase3Only || capturePhase3Full;

  if (runBefore) {
    const baselineRoot = resolveBaselineRoot();
    ensureBaselineWorktree(baselineRoot);
    applyBaselineExplainHook(baselineRoot);
    if (!fs.existsSync(path.join(baselineRoot, "node_modules"))) {
      spawnSync("npm", ["ci"], { cwd: baselineRoot, stdio: "inherit" });
    }
    activeViteRoot = baselineRoot;
    activeValidatorsRoot = baselineRoot;
    activePort = BASELINE_PORT;
    chromeVerifyMode = "baseline";
    console.log(`Phase3 BEFORE: ${baselineRoot} on port ${activePort}`);
    await runCaptureSession(capturePhase3Before);
  }

  if (runAfter) {
    activeViteRoot = root;
    activeValidatorsRoot = root;
    activePort = AFTER_PORT;
    chromeVerifyMode = "raycast";
    console.log(`Phase3 AFTER: ${root} on port ${activePort}`);
    await runCaptureSession(async (page) => {
      await capturePhase3After(page);
      if (runBefore || capturePhase3Only) {
        await buildPhase3Comparisons();
      }
    });
  }

  if (!runBefore && !runAfter) {
    activeViteRoot = root;
    activeValidatorsRoot = root;
    activePort = AFTER_PORT;
    chromeVerifyMode = "none";
    await runCaptureSession(async (page) => {
      if (!captureDarkOnly) {
        await captureInventory(page, { namePrefix: "inventory", colorScheme: "light" });
        if (captureLegacyDirections) {
          for (const dir of DIRECTIONS) {
            await captureDirection(page, dir);
          }
          await buildComparisons();
        }
      }
      if (captureLegacyDirections || captureDarkOnly) {
        for (const dir of DARK_DIRECTIONS) {
          await captureDirection(page, dir, "dark");
        }
        await buildDarkComparisons();
      }
    });
  }

  for (const name of fs.readdirSync(outDir)) {
    if (!name.endsWith(".png")) continue;
    fs.copyFileSync(path.join(outDir, name), path.join(artifactDir, name));
  }
  console.log(`Wrote ${outDir} and copied to ${artifactDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
