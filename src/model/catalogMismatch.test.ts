import { describe, expect, it } from "vitest";
import { memberMapFromList } from "./assigneeDisplay";
import {
  catalogMismatchBannerText,
  catalogMismatchKind,
} from "./catalogMismatch";
import { BUILTIN_STATUS_ITEMS } from "./statusCatalog";
import type { Member } from "./memberTypes";
import type { Task } from "./types";

const members: Member[] = [{ id: "sato", name: "佐藤" }];

function task(overrides: Partial<Task> & Pick<Task, "id">): Task {
  return {
    name: "t",
    start: "2026-01-01",
    end: "2026-01-02",
    status: "not-started",
    progress: 0,
    confidence: "tentative",
    predecessors: [],
    assigneeId: null,
    milestoneId: null,
    tags: [],
    note: "",
    ...overrides,
  };
}

describe("catalogMismatchKind", () => {
  const statuses = BUILTIN_STATUS_ITEMS;
  const catalog = memberMapFromList(members);

  it("reports status only when a task has an id missing from the catalog", () => {
    expect(
      catalogMismatchKind([task({ id: "a", status: "missing" })], statuses, catalog),
    ).toBe("status");
    expect(catalogMismatchBannerText("status")).toBe("一覧に無いステータスがあります。");
  });

  it("reports assignee only when a task has an id missing from the member catalog", () => {
    expect(
      catalogMismatchKind([task({ id: "a", assigneeId: "ghost" })], statuses, catalog),
    ).toBe("assignee");
    expect(catalogMismatchBannerText("assignee")).toBe("一覧に無い担当があります。");
  });

  it("reports both when status and assignee are missing from their catalogs", () => {
    expect(
      catalogMismatchKind(
        [task({ id: "a", status: "x", assigneeId: "y" })],
        statuses,
        catalog,
      ),
    ).toBe("both");
    expect(catalogMismatchBannerText("both")).toBe(
      "一覧に無いステータスと担当があります。",
    );
  });

  it("does not treat unassigned assignee as a mismatch", () => {
    expect(catalogMismatchKind([task({ id: "a" })], statuses, catalog)).toBe(null);
  });

  it("treats any assignee id as unknown when no catalog is selected", () => {
    expect(
      catalogMismatchKind([task({ id: "a", assigneeId: "sato" })], statuses, null),
    ).toBe("assignee");
  });

  it("returns null when every status and assignee resolves", () => {
    expect(
      catalogMismatchKind(
        [task({ id: "a", status: "done", assigneeId: "sato" })],
        statuses,
        catalog,
      ),
    ).toBe(null);
    expect(catalogMismatchBannerText(null)).toBe(null);
  });

  it("scans the whole task list, not only tasks that would pass a filter", () => {
    const hidden = task({ id: "hidden", status: "orphan" });
    const visible = task({ id: "visible", status: "not-started" });
    expect(catalogMismatchKind([visible, hidden], statuses, catalog)).toBe("status");
  });
});
