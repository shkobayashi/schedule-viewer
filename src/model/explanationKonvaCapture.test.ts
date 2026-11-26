import { describe, expect, it, vi } from "vitest";
import {
  hideExplanationKonvaLayersForCapture,
  registerExplanationKonvaCapture,
} from "./explanationKonvaCapture";

describe("hideExplanationKonvaLayersForCapture", () => {
  it("restores only layers hidden at capture start", () => {
    const first = { hide: vi.fn(), show: vi.fn() };
    const second = { hide: vi.fn(), show: vi.fn() };
    registerExplanationKonvaCapture(first);
    registerExplanationKonvaCapture(second);
    const restore = hideExplanationKonvaLayersForCapture();
    expect(first.hide).toHaveBeenCalled();
    expect(second.hide).toHaveBeenCalled();
    const third = { hide: vi.fn(), show: vi.fn() };
    registerExplanationKonvaCapture(third);
    restore();
    expect(first.show).toHaveBeenCalled();
    expect(second.show).toHaveBeenCalled();
    expect(third.show).not.toHaveBeenCalled();
  });
});
