# 計画メモ

## 目的

会議ログ・課題管理表などの入力情報をもとにLLMが立てたスケジュールを、表示・フィルタリング・編集・ズームイン/アウトできるツールを作る。

## 要件

- OS: Mac / Windows / Ubuntu 対応のGUIデスクトップアプリ
- 用途: LLM(Claude)が生成したスケジュールを表示・フィルタリング・編集・ズームイン/アウトする
- 方向性: WBS/ガントツールという見た目だが、制約やスケジュール計算の機能はすべてLLMとスキルに寄せ、アプリ自体には持たせない
- データ形式: JSON（`docs/schedule.schema.json`、`schemaVersion: 5`。カテゴリとグループは `id` を持ち、名前は表示である。担当は `assigneeId`、割り当てなしは `null`。タスクとマイルストンの `confidence` は `tentative` か `committed`。マイルストンに確度が無いときは確定として読む。メンバー一覧は別 JSON。終了日はその日を含む。開けるのは schemaVersion 3、4、5。3 は確度なしを確定として読む。4 はカテゴリとグループへ名前から決まる ID を付ける。v1 は終了日を移行したあと v2 として拒否する。詳細は [data-format.md](data-format.md)）
- 利用者: チーム内で配布・共有(自分専用ではない)

## 技術スタック(決定事項)

| 項目 | 選定 | 理由 |
|---|---|---|
| デスクトップシェル | Tauri | 軽量、Mac/Windows/Ubuntu対応、バックエンド(Rust)を薄く保てる |
| UI | React | エコシステム・人材の豊富さ、チームでの保守のしやすさ |
| タイムライン描画 | react-konva (Konva.js) | Canvas直描画でズーム時のレイアウト崩れがない。バーの直接ドラッグ&リサイズと相性が良い |
| LLM連携 | アプリに内蔵しない | スケジュールJSONはClaude(会話/スキル)側で生成し、アプリは表示・編集専用にして責務を最小化する |
| 配布 | Tauriバンドラ(dmg/msi/deb等) | チーム内配布 |

### 検討した代替案とその理由

- **PySide6(Qt) + QGraphicsView**: ライセンス・性能面では有力候補だったが、Qt自体の学習・実装コストへの懸念から見送り
- **Flet(Python+Flutter)**: Canvas上への自前描画がまだ発展途上のため見送り
- **pywebview**: Python資産をそのまま活かせるが、結局中身はHTML/CSSのレイアウトエンジンに頼るため、ズーム時のレイアウト崩れ懸念を解消できない
- **tldraw**: Canvas描画で操作感も良いが、商用利用(チーム配布含む)には有償ライセンス(または透かし表示)が必要なため不採用
- **React Flow**: MITライセンスで無料だが、本来ノード×エッジ(フローチャート)用のライブラリで、WBS/Ganttの「行×時間軸のバー」という構造にはやや無理がある
- → ライセンスフリーかつGanttの構造を素直に表現できる **Konva** を採用

## アーキテクチャ方針

- バックエンド(Rust)の責務は最小化する: ファイル読み書き・OSネイティブダイアログなどの薄い橋渡しのみ。計算ロジック・制約解決は一切持たない
- 「バックエンドはフロントでどこまでできるかで決める」方針のため、Phase 1はフロントのモックアップ・プロトタイプ作成を先行させた。Phase 1 は完了し、バックエンドに残るのはファイル読み書きだけである

## UI/UX方針

開発の初期に決めた方針で、経緯として残している。現在の操作は [外部仕様](external-spec.md) に書く。

- タスクの編集は「直接操作型」を基本とする: タイムライン上でバーをドラッグして移動、端をドラッグしてリサイズ(期間変更)
- ダブルクリックでダイアログを開き、日付・担当者・ステータス・進捗などをフォームで編集する形も併用する
- フィルタリング: 担当者・ステータス・タスク名検索(軸は今後拡張の余地あり)
- ズーム: マウスホイール(Ctrl/Cmd+ホイール)でポインタ位置を基準にズーム。ズーム段階に応じて日表示/週表示/月表示のグリッド粒度を自動切替する
- ズームの実装は、CSS変換やDOMレイアウトに頼らず「1日あたりのピクセル数」を状態として持ち再描画する方式にする(パフォーマンスとレイアウト崩れ回避のため)

## リポジトリ / 開発環境

- GitHub単一リポジトリ（`shkobayashi/schedule-viewer`）
- 採用ディレクトリ構成（Phase 0 で反映済み）:

```
/src              React (UI)
/src-tauri        Rust側 (ファイルI/Oなど薄いコマンドのみ)
/.devcontainer    DevContainer定義
/docs             計画・ADR・JSONスキーマ定義など
/.cursor/skills   LLM用スキル（write-schedule / write-members / write-calendar は他プロジェクトへコピー可）
/mockup           Konva単体プロトタイプ（Phase 1 移植の参照）
```

- **バージョン固定（Phase 0）**: Node.js 24、Rust 1.98.1（`rust-toolchain.toml` / `.nvmrc`）
- Tauri アプリ identifier: `com.collabcentral.schedule-viewer`
- 開発はVSCode + Claude Codeで実施
- DevContainerでNode.js + Rust(Tauri CLI)+ Linux向け依存(webkit2gtk等)を用意し、可搬性を確保する
  - **注意点**: DevContainerはコード編集・型チェック・ビルドまでは快適に行えるが、Tauriアプリの実際のウィンドウを起動しての動作確認はコンテナにディスプレイがないためホストOS側で行う必要がある(WSL2+WSLgやX11転送で多少緩和はできるが、基本はホスト実行が前提になる)

## ロードマップ

1. **Phase 0: 環境構築** — 完了。GitHubリポジトリ作成、DevContainer整備、Tauri+React雛形作成、Konva動作確認
2. **Phase 1: フロント作り込み** — 完了。`mockup/`のKonvaプロトタイプをReactコンポーネントに移植し、表示・フィルタ・編集・ズーム・系統・マイルストン・追加削除・配布用HTML書き出しまでを画面側で持つ。タスクの並び替えはしない
3. **Phase 2: JSONスキーマ確定** — 完了。`schemaVersion`・`title`・マイルストン・カテゴリ→グループ→タスク・`predecessors`・UUID ID。Ajv + 意味規則検証（`npm run check:schedule`）。別プロジェクト向け `.cursor/skills/write-schedule`（自己完結の検証スクリプト同梱）
4. **Phase 3: ファイルI/O実装** — 完了。JSON の開く・保存・別名保存（Tauri はネイティブダイアログ、ブラウザはファイル選択とダウンロード）。読み込み前に `validateSchedule`、未保存のまま開くときは確認
5. **Phase 4: 配布** — GitHub Release で Ubuntu の deb と Windows の NSIS を自動で作っている。署名と macOS の配布はまだ

## 画面の現状

画面の挙動は [外部仕様](external-spec.md) に移した。

## スケジュール JSON（schemaVersion 5）

形式は [データ仕様](data-format.md#スケジュール-jsonschemaversion-5) に移した。

カテゴリとグループの識別子は名前ではなく `id` である。Issue 85 の改名を、差分の削除と追加にしないためである。カテゴリやグループの追加と、タスクの付け替えはまだしない。別ファイルのマスターにはしない。

## 稼働日カレンダー JSON（schemaVersion 1）

形式は [データ仕様](data-format.md#稼働日カレンダー-jsonschemaversion-1) に移した。

## 次に詰めるべきこと

- フィルタリングの軸の最終決定(担当者・ステータス以外に必要な軸があるか)

## 今後の検討

- 動作確認
- LLMネイティブ連携機能
- 保存したりとかそういうやつ(autosaveも？)

## 既知の課題

- `mockup/schedule-viewer-mockup.html` について、プレビュー環境でcdnjs経由のKonva.jsが正しくロードされず、Canvas部分(グリッド・バー)が表示されない事象が未解決。ヘッダーやツールバーなど素のHTML/CSS部分は表示される。パスまたはCSP起因の可能性があり、実装再開時に要調査。
