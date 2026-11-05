/** スケジュールを開いたあとの後処理オプション（useScheduleFile と起動復旧の共有型）。 */
export type ApplyOpenedFileOptions = {
  restoreFilters?: boolean;
  recordRecent?: boolean;
};
