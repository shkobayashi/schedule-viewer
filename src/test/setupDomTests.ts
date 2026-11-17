import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom は offsetParent を常に null にする。CatalogEditorOverlay の Tab 循環は
// offsetParent !== null の要素だけを対象にするため、表示中の要素は親を返す。
Object.defineProperty(HTMLElement.prototype, "offsetParent", {
  configurable: true,
  get() {
    const element = this as HTMLElement;
    if (!element.isConnected) return null;
    const view = element.ownerDocument.defaultView;
    const style = view?.getComputedStyle(element);
    if (style?.display === "none" || style?.visibility === "hidden") {
      return null;
    }
    return element.parentElement;
  },
});

afterEach(() => {
  cleanup();
});
