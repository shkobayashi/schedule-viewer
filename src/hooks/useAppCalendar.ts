import { useCallback, useEffect, useState } from "react";
import type { CalendarDocument } from "../model/calendarTypes";
import {
  deleteAppCalendar,
  importAppCalendar,
  loadResolvedAppCalendar,
} from "../model/calendarAppData";
import { bumpSharedSettingsRevision } from "../model/sharedSettingsRevision";

export function useAppCalendar() {
  const [label, setLabel] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<CalendarDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await loadResolvedAppCalendar();
      setLabel(loaded.label);
      setCalendar(loaded.document);
      setError(loaded.error);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "カレンダー設定を読み込めませんでした。",
      );
      setCalendar(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const importCalendar = useCallback(
    async (fileLabel: string, contents: string) => {
      await importAppCalendar(fileLabel, contents);
      await refresh();
      bumpSharedSettingsRevision();
    },
    [refresh],
  );

  const removeCalendar = useCallback(async () => {
    await deleteAppCalendar();
    await refresh();
    bumpSharedSettingsRevision();
  }, [refresh]);

  return {
    label,
    calendar,
    loading,
    error,
    refresh,
    importCalendar,
    removeCalendar,
  };
}
