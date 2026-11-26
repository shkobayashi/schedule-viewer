import { useEffect, useState } from "react";

/** スペースキー長押しでチャート pan を中ボタン相当として扱う。 */
export function useTimelineSpacePanArm(): boolean {
  const [spacePanArmed, setSpacePanArmed] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.tagName === "BUTTON" ||
          target.closest("button, a, [role='button']"))
      ) {
        return;
      }
      if (
        target !== document.body &&
        !(target instanceof HTMLElement && target.closest(".timeline-body"))
      ) {
        return;
      }
      event.preventDefault();
      setSpacePanArmed(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpacePanArmed(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
  return spacePanArmed;
}
