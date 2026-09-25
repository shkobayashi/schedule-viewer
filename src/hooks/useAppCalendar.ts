import { useCallback, useEffect, useState } from "react";
import type { CalendarDocument } from "../model/calendarTypes";
import {
  deleteAppCalendar,
  importAppCalendar,
  loadAppCalendarState,
  readAppCalendar,
} from "../model/calendarAppData";

export function useAppCalendar() {
  const [label, setLabel] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<CalendarDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const state = await loadAppCalendarState();
      setLabel(state.label);
      setCalendar(await readAppCalendar());
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
    },
    [refresh],
  );

  const removeCalendar = useCallback(async () => {
    await deleteAppCalendar();
    await refresh();
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
