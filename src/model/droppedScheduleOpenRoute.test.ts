import { describe, expect, it } from "vitest";
import {
  routeExternalScheduleDrop,
  routeExternalWorkspaceDrop,
} from "./droppedScheduleOpenRoute";

describe("routeExternalScheduleDrop", () => {
  it("focuses the newest window that already has the same path", () => {
    const route = routeExternalScheduleDrop(
      "/proj/schedule.json",
      [
        { label: "main", path: "/proj/schedule.json", sample: false },
        { label: "schedule-2", path: "/proj/schedule.json", sample: false },
      ],
      ["main", "schedule-2"],
    );
    expect(route).toEqual({ action: "focusExisting", label: "schedule-2" });
  });

  it("opens in the only pathless window", () => {
    const route = routeExternalScheduleDrop(
      "/new.json",
      [{ label: "main", path: null, sample: false }],
      ["main"],
    );
    expect(route).toEqual({ action: "openInWindow", label: "main" });
  });

  it("opens a new window when every window already has a path", () => {
    const route = routeExternalScheduleDrop(
      "/other.json",
      [
        { label: "main", path: "/a.json", sample: false },
        { label: "schedule-2", path: "/b.json", sample: false },
      ],
      ["main", "schedule-2"],
    );
    expect(route).toEqual({ action: "openNewWindow" });
  });

  it("opens in the sole pathless window among several", () => {
    const route = routeExternalScheduleDrop(
      "/new.json",
      [
        { label: "main", path: "/a.json", sample: false },
        { label: "schedule-2", path: null, sample: false },
      ],
      ["main", "schedule-2"],
    );
    expect(route).toEqual({ action: "openInWindow", label: "schedule-2" });
  });
});

describe("routeExternalWorkspaceDrop", () => {
  it("focuses the newest window that already has the same workspace path", () => {
    const route = routeExternalWorkspaceDrop(
      "/proj/workspace.json",
      [
        {
          label: "main",
          path: "/proj/plan.json",
          workspacePath: "/proj/workspace.json",
          sample: false,
        },
        {
          label: "schedule-2",
          path: "/proj/plan.json",
          workspacePath: "/proj/workspace.json",
          sample: false,
        },
      ],
      ["main", "schedule-2"],
    );
    expect(route).toEqual({ action: "focusExisting", label: "schedule-2" });
  });
});
