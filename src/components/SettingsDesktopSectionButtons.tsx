import { isTauri } from "@tauri-apps/api/core";
import { isDesktopFirstRunRuntime } from "../model/firstRunGuidance";

type SettingsDesktopSection = "updates" | "mcp";

type SettingsDesktopSectionButtonsProps = {
  section: string;
  onSelect: (section: SettingsDesktopSection) => void;
};

export function SettingsDesktopSectionButtons({
  section,
  onSelect,
}: SettingsDesktopSectionButtonsProps) {
  if (!isDesktopFirstRunRuntime(isTauri(), import.meta.env.MODE)) return null;
  return (
    <>
      <button
        type="button"
        className={section === "updates" ? "active" : undefined}
        aria-current={section === "updates" ? "true" : undefined}
        onClick={() => onSelect("updates")}
      >
        更新
      </button>
      <button
        type="button"
        className={section === "mcp" ? "active" : undefined}
        aria-current={section === "mcp" ? "true" : undefined}
        onClick={() => onSelect("mcp")}
      >
        画面の状態を渡す
      </button>
    </>
  );
}
