import { describe, expect, it } from "vitest";
import { validateColors } from "./validateColors";

const oneItem = {
  schemaVersion: 1,
  colors: [
    {
      id: "focus",
      name: "注力",
      description: "今いちばん手を付ける作業。",
      color: {
        light: { bg: "#FEF3C7" },
        dark: { bg: "#78350F" },
      },
    },
  ],
};

describe("validateColors", () => {
  it("accepts one item", () => {
    expect(validateColors(oneItem).ok).toBe(true);
  });

  it("rejects nine items", () => {
    const colors = Array.from({ length: 9 }, (_, i) => ({
      ...oneItem.colors[0],
      id: `c${i}`,
      name: `色${i}`,
    }));
    expect(validateColors({ schemaVersion: 1, colors }).ok).toBe(false);
  });

  it("rejects duplicate id", () => {
    const doc = {
      schemaVersion: 1,
      colors: [
        oneItem.colors[0],
        { ...oneItem.colors[0], name: "二つ目" },
      ],
    };
    const result = validateColors(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.message.includes("重複"))).toBe(true);
    }
  });

  it("rejects blank name and description", () => {
    expect(
      validateColors({
        schemaVersion: 1,
        colors: [{ ...oneItem.colors[0], name: "   " }],
      }).ok,
    ).toBe(false);
    expect(
      validateColors({
        schemaVersion: 1,
        colors: [{ ...oneItem.colors[0], description: "  " }],
      }).ok,
    ).toBe(false);
  });

  it("rejects instruction and border colors", () => {
    expect(
      validateColors({
        schemaVersion: 1,
        colors: [{ ...oneItem.colors[0], instruction: "x" }],
      }).ok,
    ).toBe(false);
    expect(
      validateColors({
        schemaVersion: 1,
        colors: [
          {
            ...oneItem.colors[0],
            color: {
              light: { bg: "#FEF3C7", border: "#000000" },
              dark: { bg: "#78350F" },
            },
          },
        ],
      }).ok,
    ).toBe(false);
  });
});
