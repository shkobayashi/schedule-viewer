/** 操作の正式名（☰・macOS・パレット・右クリック・案内・スキル説明）。 */
export const OPERATION_FORMAL = {
  open: "開く",
  openNewWindow: "新しいウィンドウで開く",
  save: "保存",
  saveAs: "別名保存",
  export: "書き出し",
  exportWorkspace: "設定ファイルを新しいフォルダへ書き出す",
  showJson: "JSON を表示",
  showDiff: "差分を表示",
  copyDiff: "差分をコピー",
  guide: "操作の案内",
  shortcuts: "ショートカット一覧",
  checkForUpdates: "更新を確認",
  settings: "設定",
  clearRecentHistory: "履歴を消す",
  recentFiles: "最近開いたファイル",
  searchFocus: "検索",
  goToday: "今日",
  tierDay: "日表示",
  tierWeek: "週表示",
  tierMonth: "月表示",
  fit: "全体",
  displayScaleIn: "表示サイズを拡大",
  displayScaleOut: "表示サイズを縮小",
  undo: "取り消し",
  redo: "やり直し",
  addTask: "タスクを追加",
  addMilestone: "マイルストンを追加",
  editTask: "編集",
  deleteTask: "削除",
  duplicateTask: "複製",
  link: "線を引く",
  note: "ノート",
  lineageShow: "系統を表示",
  lineageClear: "系統を解除",
  editTitle: "タイトルを変更",
  hierarchyEdit: "階層編集",
  lineageFollowConnections: "繋がりも辿る",
} as const;

/** ツールバーだけで使う略称（#473 案 C）。 */
export const TOOLBAR_SHORT = {
  guide: "案内",
  tierDay: "日",
  tierWeek: "週",
  tierMonth: "月",
  addTask: "追加",
} as const;

export function lineagePaletteLabel(active: boolean): string {
  return active ? OPERATION_FORMAL.lineageClear : OPERATION_FORMAL.lineageShow;
}
