import { useEffect, useState } from "react";
import { todayIso } from "../model/dates";

declare global {
  interface Window {
    __manualScreenshotSetToday?: (iso: string) => void;
  }
}

export function useToday(): string {
  const [today, setToday] = useState(() => todayIso());
  useEffect(() => {
    if (import.meta.env.MODE === "manual-screenshot") {
      window.__manualScreenshotSetToday = (iso: string) => setToday(iso);
      return () => {
        delete window.__manualScreenshotSetToday;
      };
    }
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    const delay = nextMidnight.getTime() - now.getTime() + 1000;
    const timer = window.setTimeout(() => setToday(todayIso()), delay);
    return () => window.clearTimeout(timer);
  }, [today]);
  return today;
}
