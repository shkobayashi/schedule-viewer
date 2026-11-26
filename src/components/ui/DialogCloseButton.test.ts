import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DialogCloseButton } from "./DialogCloseButton";

describe("DialogCloseButton", () => {
  it("exposes dismiss label and Esc tooltip", () => {
    const html = renderToStaticMarkup(
      createElement(DialogCloseButton, { onClose: () => {} }),
    );
    expect(html).toContain('aria-label="閉じる"');
    expect(html).toContain('title="Esc"');
    expect(html).toContain("modal-close-btn");
  });
});
