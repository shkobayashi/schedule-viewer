import { expect, type Page } from "playwright/test";
import { pointerOnTaskBar, selectTaskByName } from "./drag.ts";

export async function openContextMenuAt(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.click(x, y, { button: "right" });
  await page.locator(".context-menu").waitFor({ state: "visible", timeout: 20_000 });
}

export async function openTaskBarContextMenu(page: Page, taskName: string): Promise<void> {
  await selectTaskByName(page, taskName);
  try {
    const { x, y } = await pointerOnTaskBar(page, taskName);
    await openContextMenuAt(page, x, y);
    if ((await page.locator(".context-menu").count()) === 0) {
      throw new Error("chart context menu missing");
    }
    return;
  } catch {
    const row = page.locator(".sidebar-row.task", { hasText: taskName }).first();
    const box = await row.boundingBox();
    if (!box) throw new Error(`row missing for ${taskName}`);
    await openContextMenuAt(page, box.x + box.width * 0.55, box.y + box.height / 2);
  }
}

export async function readContextMenuLabels(page: Page): Promise<string[]> {
  const items = page.locator(".context-menu [role='menuitem']");
  const count = await items.count();
  const labels: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const labelEl = items.nth(index).locator(".context-menu-label");
    const raw =
      (await labelEl.count()) > 0
        ? await labelEl.first().innerText()
        : await items.nth(index).innerText();
    const primary = raw.split("\n")[0]?.trim() ?? "";
    if (primary) labels.push(primary);
  }
  return labels;
}

export async function expectContextMenuOnly(
  page: Page,
  expectedLabels: string[],
): Promise<void> {
  const labels = await readContextMenuLabels(page);
  expect(labels).toEqual(expectedLabels);
}

export async function dismissDeleteConfirm(page: Page): Promise<void> {
  const cancel = page.getByRole("button", { name: "キャンセル" });
  await cancel.waitFor({ state: "visible", timeout: 10_000 });
  await cancel.click();
  await expect(cancel).toBeHidden({ timeout: 5_000 });
}

export async function confirmDelete(page: Page): Promise<void> {
  const ok = page.getByRole("button", { name: "削除" }).last();
  await ok.waitFor({ state: "visible", timeout: 10_000 });
  await ok.click();
  await expect(ok).toBeHidden({ timeout: 5_000 });
}
