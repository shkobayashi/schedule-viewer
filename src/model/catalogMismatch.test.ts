import { describe, expect, it } from "vitest";
import {
  catalogMismatchBannerText,
  catalogMismatchFlags,
  catalogMismatchKind,
} from "./catalogMismatch";
import { BUILTIN_STATUS_ITEMS } from "./statusCatalog";
import type { Task } from "./types";

const statuses = BUILTIN_STATUS_ITEMS;
const catalog = new Map([["sato", { id: "sato", name: "佐藤" }]]);

function task(partial: Partial<Task> & { id: string }): Task {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    start: "2026-01-01",
    end: "2026-01-02",
    assigneeIds: partial.assigneeIds ?? [],
    status: partial.status ?? "not-started",
    progress: partial.progress ?? 0,
    confidence: partial.confidence ?? "committed",
    predecessors: partial.predecessors ?? [],
    milestoneId: partial.milestoneId ?? null,
    fieldValues: partial.fieldValues,
    colorId: partial.colorId,
  };
}

describe("catalogMismatchKind", () => {
  it("reports missing status", () => {
    const flags = catalogMismatchFlags(
      [task({ id: "a", status: "missing" })],
      statuses,
      catalog,
      new Set(),
      null,
    );
    expect(flags.status).toBe(true);
    expect(catalogMismatchBannerText(flags)).toBe(
      "一覧に無いステータスがあります。",
    );
  });

  it("reports missing assignee", () => {
    const flags = catalogMismatchFlags(
      [task({ id: "a", assigneeIds: ["ghost"] })],
      statuses,
      catalog,
      new Set(),
      null,
    );
    expect(flags.assignee).toBe(true);
    expect(catalogMismatchBannerText(flags)).toBe("一覧に無い担当があります。");
  });

  it("reports missing color when catalog is loaded", () => {
    const colors = [
      {
        id: "focus",
        name: "注力",
        description: "x",
        color: { light: { bg: "#FEF3C7" }, dark: { bg: "#78350F" } },
      },
    ];
    const flags = catalogMismatchFlags(
      [task({ id: "a", colorId: "ghost-color" })],
      statuses,
      catalog,
      new Set(),
      colors,
    );
    expect(flags.color).toBe(true);
    expect(catalogMismatchBannerText(flags)).toBe("一覧に無い色があります。");
  });

  it("does not report color when catalog is unset", () => {
    const flags = catalogMismatchFlags(
      [task({ id: "a", colorId: "ghost-color" })],
      statuses,
      catalog,
      new Set(),
      null,
    );
    expect(flags.color).toBe(false);
  });

  it("does not report color when id exists in catalog", () => {
    const colors = [
      {
        id: "focus",
        name: "注力",
        description: "x",
        color: { light: { bg: "#FEF3C7" }, dark: { bg: "#78350F" } },
      },
    ];
    const flags = catalogMismatchFlags(
      [task({ id: "a", colorId: "focus" })],
      statuses,
      catalog,
      new Set(),
      colors,
    );
    expect(flags.color).toBe(false);
  });

  it("reports both status and assignee", () => {
    const flags = catalogMismatchFlags(
      [task({ id: "a", status: "missing", assigneeIds: ["ghost"] })],
      statuses,
      catalog,
      new Set(),
      null,
    );
    expect(catalogMismatchKind([task({ id: "a", status: "missing", assigneeIds: ["ghost"] })], statuses, catalog)).toBe(
      "both",
    );
    expect(catalogMismatchBannerText(flags)).toBe(
      "一覧に無いステータスと一覧に無い担当があります。",
    );
  });

  it("reports unknown field values", () => {
    const flags = catalogMismatchFlags(
      [task({ id: "a", fieldValues: { orphan_key: "x" } })],
      statuses,
      catalog,
      new Set(["known"]),
      null,
    );
    expect(flags.fieldValues).toBe(true);
    expect(catalogMismatchBannerText(flags)).toBe(
      "一覧に無い追加項目があります。",
    );
  });

  it("returns null when everything matches", () => {
    expect(catalogMismatchKind([task({ id: "a" })], statuses, catalog)).toBe(
      null,
    );
    expect(
      catalogMismatchBannerText(
        catalogMismatchFlags([task({ id: "a" })], statuses, catalog, new Set(), null),
      ),
    ).toBe(null);
  });
});
