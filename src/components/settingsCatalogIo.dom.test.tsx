import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { documentToJsonString } from "../model/serialize";
import { SettingsCatalogIoHarness } from "../test/settingsCatalogIoHarness";
import { loadRegressionSchedule } from "../test/searchErrorKeysFixtures";
import { pickMembersJsonFile } from "../model/memberAppData";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => false,
  invoke: vi.fn(),
}));

vi.mock("../model/memberAppData", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../model/memberAppData")>();
  return {
    ...actual,
    pickMembersJsonFile: vi.fn(),
  };
});

function smokeWithAssignee(assigneeId: string): string {
  const doc = structuredClone(loadRegressionSchedule("smoke.schedule.json"));
  const task = doc.categories[0]?.groups[0]?.tasks.find((item) => item.name === "設計");
  if (!task) throw new Error("設計 task missing");
  task.assigneeIds = [assigneeId];
  return documentToJsonString(doc);
}

function installMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe("settings catalog import IO", () => {
  beforeEach(() => {
    localStorage.clear();
    installMatchMedia();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("TC-SET-02: import shows catalog name, resolves assignee id, and leaves schedule JSON unchanged", async () => {
    const user = userEvent.setup();
    const membersBody = JSON.stringify({
      schemaVersion: 1,
      members: [{ id: "ws-only", name: "取り込み山田" }],
    });
    vi.mocked(pickMembersJsonFile).mockResolvedValue({
      name: "team.json",
      contents: membersBody,
    });
    render(
      <SettingsCatalogIoHarness
        scheduleText={smokeWithAssignee("ws-only")}
        assigneeTaskName="設計"
      />,
    );
    await user.click(screen.getByRole("button", { name: "取り込み…" }));
    await waitFor(() => {
      expect(screen.getByText(/使用中: team/)).toBeInTheDocument();
    });
  await waitFor(() => {
      expect(screen.getByTestId("assignee-resolution")).toHaveTextContent(
        "取り込み山田",
      );
    });
    const scheduleJson = screen.getByTestId("schedule-json").textContent ?? "";
    expect(scheduleJson).not.toContain('"members"');
    expect(scheduleJson).toContain("回帰確認");
  });

  it("TC-SET-02: import accepts description on members", async () => {
    const user = userEvent.setup();
    const membersBody = JSON.stringify({
      schemaVersion: 1,
      members: [
        {
          id: "yamada",
          name: "山田",
          description: "設計担当",
        },
      ],
    });
    vi.mocked(pickMembersJsonFile).mockResolvedValue({
      name: "desc.json",
      contents: membersBody,
    });
    render(
      <SettingsCatalogIoHarness
        scheduleText={documentToJsonString(loadRegressionSchedule("smoke.schedule.json"))}
        assigneeTaskName="設計"
      />,
    );
    await user.click(screen.getByRole("button", { name: "取り込み…" }));
    await waitFor(() => {
      expect(screen.getByText(/使用中: desc/)).toBeInTheDocument();
    });
    const catalogs = JSON.parse(
      localStorage.getItem("schedule-viewer/members/catalogs") ?? "{}",
    ) as Record<string, string>;
    expect(catalogs.desc).toContain("設計担当");
  });

  it("TC-SET-02: import rejects blank member name", async () => {
    const user = userEvent.setup();
    vi.mocked(pickMembersJsonFile).mockResolvedValue({
      name: "bad.json",
      contents: JSON.stringify({
        schemaVersion: 1,
        members: [{ id: "a", name: "  " }],
      }),
    });
    render(
      <SettingsCatalogIoHarness
        scheduleText={documentToJsonString(loadRegressionSchedule("smoke.schedule.json"))}
        assigneeTaskName="設計"
      />,
    );
    await user.click(screen.getByRole("button", { name: "取り込み…" }));
    const message = await screen.findByRole("status");
    expect(message).toHaveTextContent("メンバー名は空白にできません");
    expect(localStorage.getItem("schedule-viewer/members/catalogs")).toBeNull();
  });
});
