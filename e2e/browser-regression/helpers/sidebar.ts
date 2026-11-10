import { expect, type Locator, Page } from "playwright/test";

export function taskSearchBox(page: Page) {
  return page.getByRole("textbox", { name: "タスク名で検索" });
}

export function collapseToggleFor(page: Page, rowLabel: string): Locator {
  return page
    .locator(".sidebar-row", { hasText: rowLabel })
    .first()
    .locator("button.twist");
}

export async function dragRowGrip(
  page: Page,
  row: Locator,
  deltaY: number,
): Promise<void> {
  const grip = row.locator(".row-grip").first();
  await grip.waitFor({ state: "visible", timeout: 15_000 });
  const box = await grip.boundingBox();
  if (!box) throw new Error("row grip missing");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const yBefore = box.y;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + deltaY, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () => (await row.boundingBox())?.y ?? yBefore, { timeout: 5_000 })
    .not.toBe(yBefore);
}
