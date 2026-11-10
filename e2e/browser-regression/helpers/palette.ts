import { expect, type Page } from "playwright/test";

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
  await expect(page.locator(".command-palette-list [role='option']").first()).toBeVisible({
    timeout: 5_000,
  });
}

export async function activateHighlightedPaletteItem(page: Page): Promise<void> {
  await page.keyboard.press("Enter");
  await expect(page.locator(".command-palette-input")).toBeHidden({ timeout: 5_000 });
}
