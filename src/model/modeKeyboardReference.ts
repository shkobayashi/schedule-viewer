export type ModeKeyboardReferenceRow = {
  /** docs・テスト用の機能 ID（利用者向け文言には出さない） */
  featureId?: string;
  /** ショートカット一覧の「場面」列 */
  mode: string;
  escape: string;
  enter: string;
  tab: string;
  arrows: string;
  /** 表の下に出す補足（1文） */
  note?: string;
};

/** セルに載せない詳細。表の直下に場面名付きで並べる。 */
export const MODE_KEYBOARD_TABLE_INTRO =
  "Esc・Enter・Tab・矢印は、その場面が開いているあいだの動きです。入口用の単キー（T など）は含みません。";

/**
 * ダイアログ・パネル・モードのあいだで共通のキー操作（入口のショートカットは含めない）。
 * 表のセルは短い語句だけ。補足は note と docs/operation-entries.md。
 */
export const MODE_KEYBOARD_REFERENCE_ROWS: readonly ModeKeyboardReferenceRow[] =
  [
    {
      featureId: "EDIT-21",
      mode: "階層の編集",
      escape: "閉じる",
      enter: "—",
      tab: "次の欄",
      arrows: "行を移動",
      note: "下書きは文書へ書かず、確定は「適用」だけ。入力欄の Enter は改行のみ。",
    },
    {
      mode: "階層の名前を変更",
      escape: "キャンセル",
      enter: "保存",
      tab: "次の欄",
      arrows: "—",
      note: "保存は検証に通ったときだけ閉じます。",
    },
    {
      mode: "設定：項目編集（ステータス／メンバー／色／拡張）",
      escape: "閉じる",
      enter: "確定",
      tab: "次の要素",
      arrows: "行を選ぶ",
      note: "未保存なら確認。確認の Esc は確認だけ閉じます。行の保存は「保存」ボタン。",
    },
    {
      featureId: "EDIT-04",
      mode: "タスク詳細パネル",
      escape: "入力取り消し",
      enter: "確定",
      tab: "次の欄",
      arrows: "—",
      note: "Esc は TODO 追加の入力中だけ。パネル自体は Esc では閉じません。Enter はタグ・TODO 欄中心。",
    },
    {
      featureId: "EDIT-05",
      mode: "線を引くモード",
      escape: "終了",
      enter: "—",
      tab: "—",
      arrows: "スクロール／選択",
      note: "確定前の線は残しません。⌘/Ctrl+矢印はチャートのスクロール。",
    },
    {
      featureId: "FILTER-01",
      mode: "絞り込みパネル",
      escape: "閉じる",
      enter: "候補を選ぶ",
      tab: "次の欄",
      arrows: "候補／—",
      note: "Esc は候補一覧→パネルの順。開いているあいだ一覧の ↑↓ タスク選択は動きません。",
    },
  ];

export function modeKeyboardReferenceRows(): readonly ModeKeyboardReferenceRow[] {
  return MODE_KEYBOARD_REFERENCE_ROWS;
}
