import { openUrl } from "@tauri-apps/plugin-opener";
import type { ReleaseNotesForVersion } from "../model/releaseNotes";
import { ModalDialog } from "./ModalDialog";

const GITHUB_REPO = "shkobayashi/schedule-viewer";

type ReleaseNotesDialogProps = {
  notes: ReleaseNotesForVersion;
  onClose: () => void;
};

export function ReleaseNotesDialog({ notes, onClose }: ReleaseNotesDialogProps) {
  return (
    <ModalDialog
      title={`バージョン ${notes.version} の変更`}
      onClose={onClose}
      className="modal release-notes-modal"
      initialFocusOnPanel
    >
      <div className="release-notes-body">
        {notes.categories.map((category) => (
          <section key={category.title}>
            <h3>{category.title}</h3>
            <ul>
              {category.items.map((item) => (
                <li key={`${category.title}-${item.text}`}>
                  <span>{item.text}</span>
                  {item.issueNumbers.length > 0 ? (
                    <span className="release-notes-issues">
                      {item.issueNumbers.map((num) => (
                        <button
                          key={num}
                          type="button"
                          className="release-notes-issue-link"
                          onClick={() => {
                            void openUrl(
                              `https://github.com/${GITHUB_REPO}/issues/${num}`,
                            );
                          }}
                        >
                          #{num}
                        </button>
                      ))}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="modal-actions">
        <button type="button" className="primary" onClick={onClose}>
          閉じる
        </button>
      </div>
    </ModalDialog>
  );
}
