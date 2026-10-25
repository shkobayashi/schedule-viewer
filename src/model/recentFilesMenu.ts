import { recentFileMenuEntries } from "./recentFiles";
import type { RecentFilesStore } from "./recentFiles";

export type RecentMenuItem = {
  path: string;
  label: string;
  kind: "schedule" | "workspace";
};

export type RecentMenuSection = {
  heading: "スケジュール" | "設定ファイル";
  items: RecentMenuItem[];
};

export function recentMenuSections(store: RecentFilesStore): RecentMenuSection[] {
  const sections: RecentMenuSection[] = [];
  if (store.schedules.length > 0) {
    sections.push({
      heading: "スケジュール",
      items: recentFileMenuEntries(store.schedules).map((entry) => ({
        ...entry,
        kind: "schedule" as const,
      })),
    });
  }
  if (store.workspaces.length > 0) {
    sections.push({
      heading: "設定ファイル",
      items: recentFileMenuEntries(store.workspaces).map((entry) => ({
        ...entry,
        kind: "workspace" as const,
      })),
    });
  }
  return sections;
}

/** @deprecated recentMenuSections を使う */
export function recentMenuItems(store: RecentFilesStore): RecentMenuItem[] {
  return recentMenuSections(store).flatMap((section) => section.items);
}

export function hasRecentMenuItems(store: RecentFilesStore): boolean {
  return store.schedules.length > 0 || store.workspaces.length > 0;
}

export function recentMenuItemAriaLabel(item: RecentMenuItem): string {
  const group = item.kind === "workspace" ? "設定ファイル" : "スケジュール";
  return `${group} ${item.label}`;
}

export function recentMenuCommandPalettePrefix(
  kind: "schedule" | "workspace",
): string {
  return kind === "workspace" ? "設定ファイル " : "スケジュール ";
}
