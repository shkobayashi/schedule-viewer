import { isTauri } from "@tauri-apps/api/core";
import { GUIDE_SECTIONS, visibleGuideItems } from "../model/guideContent";
import { ModalDialog } from "./ModalDialog";

type GuideDialogProps = {
  open: boolean;
  onClose: () => void;
  onOpenShortcuts: () => void;
};

export function GuideDialog({
  open,
  onClose,
  onOpenShortcuts,
}: GuideDialogProps) {
  if (!open) return null;
  const showDesktopOnly = isTauri();

  return (
    <ModalDialog
      title="操作の案内"
      onClose={onClose}
      className="modal guide-modal"
    >
      <div className="guide-body" tabIndex={0}>
        {GUIDE_SECTIONS.map((section) => {
          const items = visibleGuideItems(section.items, showDesktopOnly);
          if (items.length === 0) return null;
          return (
            <section key={section.title}>
              <h3>{section.title}</h3>
              <ul>
                {items.map((item) => (
                  <li key={item.text}>{item.text}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <div className="modal-actions">
        <button type="button" onClick={onOpenShortcuts}>
          ショートカット一覧
        </button>
        <button type="button" className="primary" onClick={onClose}>
          閉じる
        </button>
      </div>
    </ModalDialog>
  );
}
