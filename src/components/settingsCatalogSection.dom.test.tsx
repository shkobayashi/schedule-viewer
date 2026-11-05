import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsCatalogSection } from "./SettingsCatalogSection";
import { SettingsColorsSection } from "./SettingsColorsSection";
import { SettingsMembersSection } from "./SettingsMembersSection";
import { SettingsStatusesSection } from "./SettingsStatusesSection";
import {
  colorSettingsCatalogCopy,
  memberSettingsCatalogCopy,
  statusSettingsCatalogCopy,
} from "../model/settingsCatalogSectionCopy";

const noop = vi.fn();
const emptyProps = {
  settings: { selectedCatalogId: null, catalogs: [] },
  selectedCatalogLabel: null,
  onImport: noop,
  onSelectCatalog: noop,
  onDeleteCatalog: noop,
  onOpenEditor: noop,
};

const baseSettings = {
  selectedCatalogId: "team",
  catalogs: [{ id: "team", label: "Team" }],
};

describe("Settings catalog section wrappers (C4)", () => {
  it("wires member section to member copy and note", () => {
    render(<SettingsMembersSection {...emptyProps} />);
    expect(screen.getByText(/メンバー JSON/)).toBeInTheDocument();
    expect(screen.getByText(/使用中: 未選択/)).toBeInTheDocument();
  });

  it("wires color section to color note with colorId", () => {
    render(<SettingsColorsSection {...emptyProps} />);
    expect(screen.getByText("colorId")).toBeInTheDocument();
  });

  it("wires status section to built-in fallback label", () => {
    render(<SettingsStatusesSection {...emptyProps} />);
    expect(screen.getByText(/未選択（組み込みの三件）/)).toBeInTheDocument();
  });
});

describe("SettingsCatalogSection DOM (C4)", () => {
  it("renders color note actions and catalog row labels", () => {
    render(
      <SettingsCatalogSection
        settings={baseSettings}
        selectedCatalogLabel="Team"
        kindCopy={colorSettingsCatalogCopy}
        note={
          <>
            色の一覧 JSON をアプリデータへ取り込み、行の地に使う色を一つ選びます。
          </>
        }
        onImport={vi.fn()}
        onSelectCatalog={vi.fn()}
        onDeleteCatalog={vi.fn()}
        onOpenEditor={vi.fn()}
        pickFile={async () => null}
        catalogIdFromFilename={() => "team"}
        validateImportedJson={() => ({ ok: true })}
      />,
    );
    expect(screen.getByText(/色の一覧 JSON/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取り込み…" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "項目を編集…" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Team" })).toBeChecked();
    expect(
      screen.getByRole("button", { name: "選択を解除" }),
    ).toBeEnabled();
  });

  it("shows color overwrite dialog before list with aria-label", async () => {
    const user = userEvent.setup();
    render(
      <SettingsCatalogSection
        settings={{
          selectedCatalogId: null,
          catalogs: [{ id: "team", label: "Team" }],
        }}
        selectedCatalogLabel={null}
        kindCopy={colorSettingsCatalogCopy}
        note={<>色</>}
        onImport={vi.fn()}
        onSelectCatalog={vi.fn()}
        onDeleteCatalog={vi.fn()}
        onOpenEditor={vi.fn()}
        pickFile={async () => ({
          name: "team.json",
          contents: '{"schemaVersion":1,"colors":[]}',
        })}
        catalogIdFromFilename={() => "team"}
        validateImportedJson={() => ({ ok: true })}
      />,
    );
    await user.click(screen.getByRole("button", { name: "取り込み…" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: "上書きの確認",
    });
    const list = screen.getByRole("list");
    expect(
      dialog.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      within(dialog).getByRole("button", { name: "上書きする" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "やめる" })).toBeInTheDocument();
  });

  it("shows member overwrite dialog after clear selection and list", async () => {
    const user = userEvent.setup();
    render(
      <SettingsCatalogSection
        settings={{
          selectedCatalogId: "team",
          catalogs: [{ id: "team", label: "Team" }],
        }}
        selectedCatalogLabel="Team"
        kindCopy={memberSettingsCatalogCopy}
        note={<>メンバー</>}
        onImport={vi.fn()}
        onSelectCatalog={vi.fn()}
        onDeleteCatalog={vi.fn()}
        onOpenEditor={vi.fn()}
        pickFile={async () => ({
          name: "team.json",
          contents: "{}",
        })}
        catalogIdFromFilename={() => "team"}
        validateImportedJson={() => ({ ok: true })}
      />,
    );
    await user.click(screen.getByRole("button", { name: "取り込み…" }));
    const dialog = await screen.findByRole("alertdialog");
    const clearBtn = screen.getByRole("button", { name: "選択を解除" });
    expect(
      clearBtn.compareDocumentPosition(dialog) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(
      within(dialog).getByRole("button", { name: "上書き" }),
    ).toHaveClass("toolbar-btn-primary");
  });

  it("shows status overwrite dialog before list like color", async () => {
    const user = userEvent.setup();
    render(
      <SettingsCatalogSection
        settings={{
          selectedCatalogId: null,
          catalogs: [{ id: "team", label: "Team" }],
        }}
        selectedCatalogLabel={null}
        kindCopy={statusSettingsCatalogCopy}
        note={<>ステータス</>}
        onImport={vi.fn()}
        onSelectCatalog={vi.fn()}
        onDeleteCatalog={vi.fn()}
        onOpenEditor={vi.fn()}
        pickFile={async () => ({
          name: "team.json",
          contents: "{}",
        })}
        catalogIdFromFilename={() => "team"}
        validateImportedJson={() => ({ ok: true })}
      />,
    );
    expect(screen.getByText(/未選択（組み込みの三件）/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "取り込み…" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: "上書きの確認",
    });
    const list = screen.getByRole("list");
    expect(
      dialog.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("hides member clear selection when nothing is selected", () => {
    render(
      <SettingsCatalogSection
        settings={{
          selectedCatalogId: null,
          catalogs: [{ id: "team", label: "Team" }],
        }}
        selectedCatalogLabel={null}
        kindCopy={memberSettingsCatalogCopy}
        note={<>メンバー</>}
        onImport={vi.fn()}
        onSelectCatalog={vi.fn()}
        onDeleteCatalog={vi.fn()}
        onOpenEditor={vi.fn()}
        pickFile={async () => null}
        catalogIdFromFilename={() => "team"}
        validateImportedJson={() => ({ ok: true })}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "選択を解除" }),
    ).not.toBeInTheDocument();
  });

  it("disables color clear selection when no catalog is selected", () => {
    render(
      <SettingsCatalogSection
        settings={{
          selectedCatalogId: null,
          catalogs: [{ id: "team", label: "Team" }],
        }}
        selectedCatalogLabel={null}
        kindCopy={colorSettingsCatalogCopy}
        note={<>色</>}
        onImport={vi.fn()}
        onSelectCatalog={vi.fn()}
        onDeleteCatalog={vi.fn()}
        onOpenEditor={vi.fn()}
        pickFile={async () => null}
        catalogIdFromFilename={() => "team"}
        validateImportedJson={() => ({ ok: true })}
      />,
    );
    expect(screen.getByRole("button", { name: "選択を解除" })).toBeDisabled();
  });
});
