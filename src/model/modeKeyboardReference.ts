export type ModeKeyboardReferenceRow = {
  /** ショートカット一覧の「場面」列 */
  mode: string;
  escape: string;
  enter: string;
  tab: string;
  arrows: string;
};

/**
 * ダイアログ・パネル・モードのあいだで共通のキー操作（入口のショートカットは含めない）。
 * 文言は ShortcutsDialog と docs/operation-entries.md と揃える。
 */
export const MODE_KEYBOARD_REFERENCE_ROWS: readonly ModeKeyboardReferenceRow[] =
  [
    {
      mode: "階層の編集（EDIT-21）",
      escape: "閉じる（下書きは文書へ書かない。確定は「適用」のみ）",
      enter: "入力欄では改行せず確定しない（適用ボタンで反映）",
      tab: "欄とボタンの間を移動（ダイアログ内でループ）",
      arrows: "↑↓ で段の行を移し、同じ列（名前・意味・指示）にフォーカス",
    },
    {
      mode: "階層の名前を変更",
      escape: "キャンセル（保存しない）",
      enter: "保存（検証に通れば閉じる）",
      tab: "欄とボタンの間を移動",
      arrows: "（一覧なし）",
    },
    {
      mode: "設定：ステータス／メンバー／色／拡張項目の項目編集",
      escape: "閉じる（未保存なら確認。確認ダイアログ中は Esc で確認だけ閉じる）",
      enter: "フォーカス中の入力欄の確定（行全体の保存は「保存」ボタン）",
      tab: "覆い内の操作可能な要素を移動（ループ）",
      arrows: "項目一覧にフォーカスがあるとき ↑↓ で行を選ぶ",
    },
    {
      mode: "タスク詳細パネル（EDIT-04）",
      escape: "TODO 追加の入力中だけ取り消し。パネル自体は Esc では閉じない",
      enter: "タグ欄・TODO 欄では確定。ほかの欄はブラウザの Enter 動作",
      tab: "欄の間を移動",
      arrows: "フォーカスが入力欄・選択欄のときは一覧の ↑↓ 選択は動かない",
    },
    {
      mode: "線を引くモード（EDIT-05）",
      escape: "モードを終了（確定前の線は残さない）",
      enter: "（モード専用の確定なし）",
      tab: "（変化なし）",
      arrows: "チャートの ⌘/Ctrl+矢印はスクロール。タスク ↑↓ は入力欄外で有効",
    },
    {
      mode: "絞り込みパネル（FILTER-01）",
      escape: "候補一覧を開いていれば閉じる。閉じていればパネル全体を閉じる",
      enter: "タグ・マイルストン等の候補一覧で候補を選ぶ",
      tab: "パネル内の欄を移動",
      arrows: "候補一覧で ↑↓。パネルが開いているあいだは一覧の ↑↓ タスク選択は動かない",
    },
  ];

export function modeKeyboardReferenceRows(): readonly ModeKeyboardReferenceRow[] {
  return MODE_KEYBOARD_REFERENCE_ROWS;
}
