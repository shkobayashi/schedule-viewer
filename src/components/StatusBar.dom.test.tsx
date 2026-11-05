import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { saveHintLabel } from "../model/firstRunGuidance";
import { StatusBar } from "./StatusBar";

function renderBar(saveHint: string | null) {
  render(
    <StatusBar
      fileName="サンプルデータ"
      saveStatus="未保存"
      saveStatusClickable={false}
      onSaveStatusClick={vi.fn()}
      membersCatalogLabel={null}
      membersCatalogError={null}
      calendarError={null}
      colorsCatalogError={null}
      tier="week"
      visibleTaskCount={2}
      totalTaskCount={2}
      showDeferredReload={false}
      onDeferredReload={vi.fn()}
      onOpenSettingsMembers={vi.fn()}
      onOpenSettingsCalendar={vi.fn()}
      onOpenShortcuts={vi.fn()}
      saveHint={saveHint}
    />,
  );
}

describe("StatusBar save hint", () => {
  it("shows the mac and windows save hint text", () => {
    const { unmount } = render(
      <StatusBar
        fileName="サンプルデータ"
        saveStatus="未保存"
        saveStatusClickable={false}
        onSaveStatusClick={vi.fn()}
        membersCatalogLabel={null}
        membersCatalogError={null}
        calendarError={null}
        colorsCatalogError={null}
        tier="week"
        visibleTaskCount={2}
        totalTaskCount={2}
        showDeferredReload={false}
        onDeferredReload={vi.fn()}
        onOpenSettingsMembers={vi.fn()}
        onOpenSettingsCalendar={vi.fn()}
        onOpenShortcuts={vi.fn()}
        saveHint={saveHintLabel(true)}
      />,
    );
    expect(screen.getByRole("note")).toHaveTextContent("保存は ☰ または ⌘S");
    unmount();
    renderBar(saveHintLabel(false));
    expect(screen.getByRole("note")).toHaveTextContent("保存は ☰ または Ctrl+S");
  });

  it("omits the hint when saveHint is absent", () => {
    renderBar(null);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.getByText("未保存")).toBeInTheDocument();
  });
});
