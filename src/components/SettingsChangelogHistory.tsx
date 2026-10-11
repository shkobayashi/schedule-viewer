import { useEffect, useMemo, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import changelogMd from "../../CHANGELOG.md?raw";
import {
  parseBundledChangelogVersions,
  type BundledReleaseNotesVersion,
} from "../model/releaseNotes";

const GITHUB_REPO = "shkobayashi/schedule-viewer";

type SettingsChangelogHistoryProps = {
  active: boolean;
};

export function SettingsChangelogHistory({ active }: SettingsChangelogHistoryProps) {
  const versions = useMemo(
    () => parseBundledChangelogVersions(changelogMd),
    [],
  );
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (!active) {
      setRevealedCount(0);
      return;
    }
    if (versions.length === 0) {
      setRevealedCount(0);
      return;
    }
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      setRevealedCount(versions.length);
      return;
    }
    setRevealedCount(0);
    let count = 0;
    const id = window.setInterval(() => {
      count += 1;
      setRevealedCount(count);
      if (count >= versions.length) {
        window.clearInterval(id);
      }
    }, 48);
    return () => window.clearInterval(id);
  }, [active, versions.length]);

  return (
    <div className="settings-changelog">
      <h3 className="settings-changelog-heading">変更履歴</h3>
      <p className="settings-note settings-changelog-note">
        この版に同梱されている変更です。まだ入れていない版は、各 Release
        のページに載ります。
      </p>
      <div
        className="settings-changelog-scroll"
        tabIndex={0}
        aria-label="変更履歴"
      >
        <ol className="settings-changelog-timeline">
          {versions.map((entry, index) => (
            <ChangelogVersionEntry
              key={entry.version}
              entry={entry}
              visible={index < revealedCount}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}

type ChangelogVersionEntryProps = {
  entry: BundledReleaseNotesVersion;
  visible: boolean;
};

function ChangelogVersionEntry({
  entry,
  visible,
}: ChangelogVersionEntryProps) {
  return (
    <li
      className={
        visible
          ? "settings-changelog-version settings-changelog-version-visible"
          : "settings-changelog-version"
      }
      {...(!visible ? { inert: true } : {})}
    >
      <div className="settings-changelog-version-meta">
        <h3 className="settings-changelog-version-label">{entry.version}</h3>
        {entry.releaseDate ? (
          <time
            className="settings-changelog-version-date"
            dateTime={entry.releaseDate}
          >
            {entry.releaseDate}
          </time>
        ) : null}
      </div>
      <div className="settings-changelog-version-body">
        {entry.categories.map((category) => (
          <section key={`${entry.version}-${category.title}`}>
            <h4 className="settings-changelog-category">{category.title}</h4>
            <ul className="settings-changelog-items">
              {category.items.map((item) => (
                <li key={`${category.title}-${item.text}`}>
                  <span>{item.text}</span>
                  {item.issueNumbers.length > 0 ? (
                    <span className="settings-changelog-issues">
                      {item.issueNumbers.map((num) => (
                        <button
                          key={num}
                          type="button"
                          className="settings-changelog-issue-link"
                          aria-label={`Issue ${num}`}
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
    </li>
  );
}
