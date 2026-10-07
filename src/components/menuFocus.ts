export function menuItems(menu: ParentNode): HTMLButtonElement[] {
  return [
    ...menu.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)',
    ),
  ];
}

function focusMenuItem(item: HTMLButtonElement | undefined): void {
  item?.focus({ preventScroll: true });
}

export function focusMenuEdge(menu: ParentNode, edge: "first" | "last"): void {
  const items = menuItems(menu);
  const target = edge === "first" ? items[0] : items[items.length - 1];
  focusMenuItem(target);
}

/** メニュー項目を上下と Home/End で動かす。扱ったキーなら true。 */
export function moveMenuFocus(menu: ParentNode, key: string): boolean {
  const items = menuItems(menu);
  if (items.length === 0) return false;
  const current = items.indexOf(document.activeElement as HTMLButtonElement);
  if (key === "Home") {
    focusMenuItem(items[0]);
    return true;
  }
  if (key === "End") {
    focusMenuItem(items[items.length - 1]);
    return true;
  }
  if (key === "ArrowDown") {
    const next = current < 0 || current >= items.length - 1 ? 0 : current + 1;
    focusMenuItem(items[next]);
    return true;
  }
  if (key === "ArrowUp") {
    const next = current <= 0 ? items.length - 1 : current - 1;
    focusMenuItem(items[next]);
    return true;
  }
  return false;
}
