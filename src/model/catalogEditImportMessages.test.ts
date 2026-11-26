/**
 * C0: カタログ取り込み（AppData）の利用者向け文言を固定する。
 * 手動: TC-SET-02b（重複）、空 ID、読み取り時の不正 JSON（取り込み自体は生文字列を保存する）。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { importColorCatalog, readColorCatalog } from "./colorAppData";
import { importMemberCatalog, readMemberCatalog } from "./memberAppData";
import { importStatusCatalog, readStatusCatalog } from "./statusAppData";

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

describe("catalog import messages (C0)", () => {
  it("rejects empty catalog id with trailing period (members)", async () => {
    installLocalStorage();
    await expect(
      importMemberCatalog("  ", '{"schemaVersion":1,"members":[]}', false),
    ).rejects.toThrow("カタログ名が空です。");
  });

  it("rejects duplicate catalog id (members)", async () => {
    installLocalStorage();
    const body = '{"schemaVersion":1,"members":[]}';
    await importMemberCatalog("team", body, false);
    await expect(importMemberCatalog("team", body, false)).rejects.toThrow(
      "同じ名前のカタログが既にあります。",
    );
  });

  it("rejects invalid members JSON on read after import", async () => {
    installLocalStorage();
    await importMemberCatalog("team", "{not json", false);
    await expect(readMemberCatalog("team")).rejects.toThrow(
      "メンバー JSON の形式が正しくありません。",
    );
  });

  it("rejects invalid status JSON on read after import", async () => {
    installLocalStorage();
    await importStatusCatalog("team", "{not json", false);
    await expect(readStatusCatalog("team")).rejects.toThrow(
      "ステータス JSON の形式が正しくありません。",
    );
  });

  it("rejects invalid colors JSON on read after import", async () => {
    installLocalStorage();
    await importColorCatalog("team", "{not json", false);
    await expect(readColorCatalog("team")).rejects.toThrow(
      "色の一覧 JSON の形式が正しくありません。",
    );
  });

  it("returns null for empty stored body on read (status)", async () => {
    installLocalStorage();
    await importStatusCatalog("empty", "", false);
    expect(await readStatusCatalog("empty")).toBeNull();
  });

  it("returns null for empty stored body on read (colors)", async () => {
    installLocalStorage();
    await importColorCatalog("empty", "", false);
    expect(await readColorCatalog("empty")).toBeNull();
  });

  it("rejects browser storage failure with fixed message", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    });
    await expect(
      importStatusCatalog(
        "team",
        '{"schemaVersion":2,"statuses":[]}',
        false,
      ),
    ).rejects.toThrow("ブラウザの保存領域に書けませんでした。");
  });
});
