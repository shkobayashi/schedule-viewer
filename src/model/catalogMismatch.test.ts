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
    assigneeId: partial.assigneeId ?? null,
    status: partial.status ?? "not-started",
    progress: partial.progress ?? 0,
    confidence: partial.confidence ?? "committed",
    predecessors: partial.predecessors ?? [],
    milestoneId: partial.milestoneId ?? null,
    fieldValues: partial.fieldValues,
  };
}

describe("catalogMismatchKind", () => {
  it("reports missing status", () => {
    const flags = catalogMismatchFlags(
      [task({ id: "a", status: "missing" })],
      statuses,
      catalog,
      new Set(),
    );
    expect(flags.status).toBe(true);
    expect(catalogMismatchBannerText(flags)).toBe(
      "一覧に無いステータスがあります。",
    );
  });

  it("reports missing assignee", () => {
    const flags = catalogMismatchFlags(
      [task({ id: "a", assigneeId: "ghost" })],
      statuses,
      catalog,
      new Set(),
    );
    expect(flags.assignee).toBe(true);
    expect(catalogMismatchBannerText(flags)).toBe("一覧に無い担当があります。");
  });

  it("reports both status and assignee", () => {
    const flags = catalogMismatchFlags(
      [task({ id: "a", status: "missing", assigneeId: "ghost" })],
      statuses,
      catalog,
      new Set(),
    );
    expect(catalogMismatchKind([task({ id: "a", status: "missing", assigneeId: "ghost" })], statuses, catalog)).toBe(
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
        catalogMismatchFlags([task({ id: "a" })], statuses, catalog, new Set()),
      ),
    ).toBe(null);
  });
});
