import { useEffect, useRef, useState } from "react";

type UpdateOfferNoticeProps = {
  message: string;
  mode: "offer" | "installing" | "info";
  embedded?: boolean;
  onLater?: () => void;
  onInstall?: () => void;
  onHeightChange?: (height: number) => void;
  liveAnnouncementKey?: string;
  shouldAnnounceOffer?: (key: string) => boolean;
  onOfferAnnounced?: (key: string) => void;
};

export function UpdateOfferNotice({
  message,
  mode,
  embedded = false,
  onLater,
  onInstall,
  onHeightChange,
  liveAnnouncementKey,
  shouldAnnounceOffer,
  onOfferAnnounced,
}: UpdateOfferNoticeProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const node = boxRef.current;
    if (!node || !onHeightChange) return;
    const report = () => onHeightChange(node.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [message, mode, onHeightChange]);

  useEffect(() => {
    if (mode !== "offer" || !liveAnnouncementKey) return;
    if (shouldAnnounceOffer && !shouldAnnounceOffer(liveAnnouncementKey)) {
      return;
    }
    onOfferAnnounced?.(liveAnnouncementKey);
    setAnnouncement(message);
  }, [liveAnnouncementKey, message, mode, onOfferAnnounced, shouldAnnounceOffer]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Escape" || mode !== "offer") return;
    event.stopPropagation();
    onLater?.();
  };

  return (
    <div
      ref={boxRef}
      className={
        embedded
          ? "app-update-offer app-update-offer--embedded"
          : "app-update-offer"
      }
      onKeyDown={onKeyDown}
    >
      <p className="app-update-offer-message">{message}</p>
      {mode === "offer" ? (
        <div className="settings-actions app-update-offer-actions">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => onLater?.()}
          >
            あとで
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => onInstall?.()}
          >
            入れ直す
          </button>
        </div>
      ) : null}
      {announcement ? (
        <p
          className="visually-hidden"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {announcement}
        </p>
      ) : null}
    </div>
  );
}
