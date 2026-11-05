import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CATALOG_EDITOR_SHARED_COPY,
  colorCatalogEditorCopy,
  memberCatalogEditorCopy,
  statusCatalogEditorCopy,
  type CatalogEditorCopy,
} from "../model/catalogEditorCopy";
import { CatalogEditorOverlay } from "./CatalogEditorOverlay";

const noop = () => {};
const noopAsync = async () => {};

function stubPanel() {
  return () => (
    <div data-testid="editor-panel">
      <button type="button">パネル内操作</button>
      <input type="text" aria-label="下書き欄" />
    </div>
  );
}

function renderOverlay(
  copy: CatalogEditorCopy,
  overrides: Partial<Parameters<typeof CatalogEditorOverlay>[0]> = {},
) {
  const props = {
    copy,
    mode: "app" as const,
    catalogs: [{ id: "team", label: "Team" }],
    editingCatalogId: "team",
    editingItems: [] as readonly unknown[],
    itemsRevision: 0,
    appliedCatalogId: "team",
    workspaceFileLabel: null,
    workspaceAppliedNote: "",
    busy: false,
    message: null,
    setMessage: noop,
    onDirtyChange: noop,
    discardPrompt: null,
    copyConfirmOpen: false,
    removeConfirmOpen: false,
    dirty: false,
    onConfirmDiscard: noopAsync,
    onCancelDiscard: noop,
    onConfirmCopy: noop,
    onCancelCopy: noop,
    onRequestRemoveCatalog: noop,
    onConfirmRemoveCatalog: noopAsync,
    onCancelRemoveCatalog: noop,
    onSelectCatalog: noop,
    onRequestClose: noop,
    onRequestNewList: noop,
    onRequestCopyList: noop,
    onSaveApp: noopAsync,
    onSaveWorkspace: noopAsync,
    panel: stubPanel(),
    ...overrides,
  };
  return render(
    <CatalogEditorOverlay
      {...props}
      panel={props.panel as Parameters<typeof CatalogEditorOverlay>[0]["panel"]}
    />,
  );
}

describe("CatalogEditorOverlay DOM (C3 follow-up)", () => {
  it.each([
    ["member", memberCatalogEditorCopy],
    ["status", statusCatalogEditorCopy],
    ["color", colorCatalogEditorCopy],
  ] as const)("shows %s catalog title and picker actions", (_kind, copy) => {
    renderOverlay(copy);
    expect(
      screen.getByRole("heading", { name: copy.overlayTitle }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.newListButton })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: CATALOG_EDITOR_SHARED_COPY.copyList }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: CATALOG_EDITOR_SHARED_COPY.remove }),
    ).toBeEnabled();
    expect(screen.getByRole("group", { name: copy.pickerLegend })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Team" })).toBeChecked();
  });

  it("shows member-specific applied note when chart uses this catalog", () => {
    renderOverlay(memberCatalogEditorCopy);
    expect(screen.getByText(memberCatalogEditorCopy.appliedThis)).toBeInTheDocument();
  });

  it("shows status remove-in-use warning in confirm dialog", () => {
    renderOverlay(statusCatalogEditorCopy, {
      removeConfirmOpen: true,
      dirty: true,
      appliedCatalogId: "team",
      editingCatalogId: "team",
    });
    const dialog = screen.getByRole("alertdialog", {
      name: statusCatalogEditorCopy.removeConfirmAria,
    });
    expect(within(dialog).getByText(statusCatalogEditorCopy.removeConfirmLead)).toBeInTheDocument();
    expect(
      within(dialog).getByText(statusCatalogEditorCopy.removeConfirmInUseExtra),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(CATALOG_EDITOR_SHARED_COPY.dirtyDiscardLine)).toBeInTheDocument();
  });

  it("shows copy confirm body for color catalog", () => {
    renderOverlay(colorCatalogEditorCopy, { copyConfirmOpen: true });
    expect(screen.getByText(colorCatalogEditorCopy.copyConfirmBody)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: CATALOG_EDITOR_SHARED_COPY.copyConfirmConfirm }),
    ).toBeInTheDocument();
  });

  it("marks the main panel inert while discard confirm is open", () => {
    const { container } = renderOverlay(memberCatalogEditorCopy, {
      discardPrompt: "close",
    });
    const panel = container.querySelector(".status-catalog-overlay-panel");
    expect(panel).toHaveAttribute("inert");
  });

  it("focuses discard confirm on open", async () => {
    renderOverlay(memberCatalogEditorCopy, { discardPrompt: "close" });
    await waitFor(() => {
      expect(document.activeElement).toHaveTextContent(
        CATALOG_EDITOR_SHARED_COPY.discardConfirm,
      );
    });
  });

  it("Escape on discard confirm calls cancel handler", async () => {
    const onCancelDiscard = vi.fn();
    const { container } = renderOverlay(memberCatalogEditorCopy, {
      discardPrompt: "close",
      onCancelDiscard,
    });
    const overlay = container.querySelector(".status-catalog-overlay");
    expect(overlay).not.toBeNull();
    fireEvent.keyDown(overlay!, { key: "Escape" });
    expect(onCancelDiscard).toHaveBeenCalledTimes(1);
  });

  it("Tab wraps focus from panel end to start", () => {
    const { container } = renderOverlay(memberCatalogEditorCopy);
    const overlay = container.querySelector(".status-catalog-overlay");
    const panel = container.querySelector(".status-catalog-overlay-panel");
    expect(overlay).not.toBeNull();
    expect(panel).not.toBeNull();
    const focusables = [
      ...panel!.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((node) => node.offsetParent !== null && !node.closest("[inert]"));
    expect(focusables.length).toBeGreaterThan(1);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    last.focus();
    fireEvent.keyDown(overlay!, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    first.focus();
    fireEvent.keyDown(overlay!, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
