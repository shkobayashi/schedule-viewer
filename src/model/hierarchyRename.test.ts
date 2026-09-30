import { describe, expect, it } from "vitest";
import { renameCategory, renameGroup } from "./tasks";
import type { Category } from "./types";

const CAT_A = "c1000001-0000-4000-8000-000000000001";
const CAT_B = "c1000001-0000-4000-8000-000000000002";
const GRP_A = "d1000001-0000-4000-8000-000000000001";
const GRP_B = "d1000001-0000-4000-8000-000000000002";

function categories(): Category[] {
  return [
    {
      id: CAT_A,
      name: "設計",
      groups: [
        { id: GRP_A, name: "上流", tasks: [] },
        { id: GRP_B, name: "詳細", tasks: [] },
      ],
    },
    {
      id: CAT_B,
      name: "開発",
      groups: [{ id: "d1000001-0000-4000-8000-000000000003", name: "上流", tasks: [] }],
    },
  ];
}

describe("renameCategory", () => {
  it("trims the name and keeps the id", () => {
    const result = renameCategory(categories(), CAT_A, "  詳細設計  ");
    expect(result.error).toBeNull();
    expect(result.changed).toBe(true);
    expect(result.categories[0]).toMatchObject({ id: CAT_A, name: "詳細設計" });
  });

  it("keeps the original name when the input is blank", () => {
    const before = categories();
    const result = renameCategory(before, CAT_A, "   ");
    expect(result.error).toBeNull();
    expect(result.changed).toBe(false);
    expect(result.categories[0]?.name).toBe("設計");
  });

  it("rejects a duplicate category name", () => {
    const result = renameCategory(categories(), CAT_A, "開発");
    expect(result.error).toBe("カテゴリ名が重複しています");
    expect(result.changed).toBe(false);
    expect(result.categories[0]?.name).toBe("設計");
  });
});

describe("renameGroup", () => {
  it("rejects a duplicate name in the same category", () => {
    const result = renameGroup(categories(), GRP_A, "詳細");
    expect(result.error).toBe("同じカテゴリ内でグループ名が重複しています");
    expect(result.changed).toBe(false);
  });

  it("allows the same group name in another category", () => {
    const result = renameGroup(
      categories(),
      "d1000001-0000-4000-8000-000000000003",
      "詳細",
    );
    expect(result.error).toBeNull();
    expect(result.changed).toBe(true);
    expect(result.categories[1]?.groups[0]?.name).toBe("詳細");
  });

  it("keeps the original name when the input is blank", () => {
    const result = renameGroup(categories(), GRP_A, " ");
    expect(result.error).toBeNull();
    expect(result.changed).toBe(false);
    expect(result.categories[0]?.groups[0]?.name).toBe("上流");
  });
});
