import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteMemberCatalog,
  importMemberCatalog,
  readMemberCatalog,
  seedSampleMemberCatalogOnce,
  stripUtf8Bom,
} from "./memberAppData";

const memory = new Map<string, string>();

function installLocalStorage() {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  });
}

afterEach(() => {
  memory.clear();
  vi.unstubAllGlobals();
});

describe("stripUtf8Bom", () => {
  it("drops a leading BOM and leaves other text unchanged", () => {
    expect(stripUtf8Bom("\uFEFF{\"a\":1}")).toBe('{"a":1}');
    expect(stripUtf8Bom('{"a":1}')).toBe('{"a":1}');
  });
});

describe("member catalog storage", () => {
  it("stores imported JSON without a BOM and reads it back", async () => {
    installLocalStorage();
    const body = `${"\uFEFF"}{"schemaVersion":1,"members":[{"id":"a","name":"田中"}]}`;
    await importMemberCatalog("team", body, false);
    const doc = await readMemberCatalog("team");
    expect(doc?.members[0]?.name).toBe("田中");
    expect(memory.get("schedule-viewer/members/catalogs")).not.toContain("\uFEFF");
  });

  it("imports the sample only once when two seeds overlap", async () => {
    installLocalStorage();
    const sample = '{"schemaVersion":1,"members":[{"id":"a","name":"田中"}]}';
    await Promise.all([
      seedSampleMemberCatalogOnce("sample", sample),
      seedSampleMemberCatalogOnce("sample", sample),
    ]);
    expect((await readMemberCatalog("sample"))?.members).toHaveLength(1);
  });

  it("turns a storage failure into a user-facing error", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    });
    await expect(
      importMemberCatalog(
        "team",
        '{"schemaVersion":1,"members":[]}',
        false,
      ),
    ).rejects.toThrow("ブラウザの保存領域に書けませんでした。");
  });

  it("does not restore a sample catalog after it was removed", async () => {
    installLocalStorage();
    const sample = '{"schemaVersion":1,"members":[]}';
    await seedSampleMemberCatalogOnce("sample", sample);
    await deleteMemberCatalog("sample");
    await seedSampleMemberCatalogOnce("sample", sample);
    expect(await readMemberCatalog("sample")).toBeNull();
  });
});
