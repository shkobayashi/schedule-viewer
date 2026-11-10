import type { Page } from "playwright/test";

export async function openCommandPalette(page: Page): Promise<void> {
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.press(`${mod}+KeyK`);
  await page.locator(".command-palette-input").waitFor({ state: "visible", timeout: 10_000 });
}

export async function closeCommandPalette(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.locator(".command-palette-input").waitFor({ state: "hidden", timeout: 10_000 });
}

export async function runPaletteQuery(page: Page, query: string): Promise<void> {
  const input = page.locator(".command-palette-input");
  await input.fill(query);
  await page.waitForTimeout(150);
}

export async function activateHighlightedPaletteItem(page: Page): Promise<void> {
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
}
