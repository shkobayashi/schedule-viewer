---
name: publish-user-manual
description: >-
  Builds and deploys the schedule-viewer user manual to GitHub Pages from main.
  Use for manual-site build scripts, pages.yml, CI manual job, and publish URL
  docs. Not for app UI, release artifacts, or manual prose unless tied to site
  build or deploy.
---

# publish-user-manual（操作マニュアルの GitHub Pages）

操作マニュアルだけを静的サイトにビルドし、`main` への push で [GitHub Pages](https://shkobayashi.github.io/schedule-viewer/) に公開する。アプリの配布、版番号、Release ワークフローはこのスキルの対象外である。

## 着手前

1. [AGENTS.md](../../../AGENTS.md) の表で [docs/development.md](../../../docs/development.md) を読み、触る箇所を絞る
2. ビルドの正本は [scripts/build-user-manual-site.mjs](../../../scripts/build-user-manual-site.mjs) と [scripts/manual-site/manual.css](../../../scripts/manual-site/manual.css) である
3. 公開の正本は [.github/workflows/pages.yml](../../../.github/workflows/pages.yml) である。pull request では [.github/workflows/ci.yml](../../../.github/workflows/ci.yml) の `manual` ジョブがビルドだけ検査する

## 載せる範囲

1. 載せる Markdown は [docs/user-manual.md](../../../docs/user-manual.md)、[docs/user-manual/getting-started.md](../../../docs/user-manual/getting-started.md)、[docs/user-manual/tutorial.md](../../../docs/user-manual/tutorial.md)、[docs/user-manual/features.md](../../../docs/user-manual/features.md) と `docs/user-manual/images/` だけである
2. マニュアルの Markdown 本文は、GitHub 上で読める形を保つ。リンクの付け替えはビルド時だけ行う
3. マニュアル同士のリンクは `site/` 直下の HTML（`index.html`、`getting-started.html`、`tutorial.html`、`features.html`）へ向ける
4. 外部仕様、データ仕様、開発ガイドなど `docs/` のほかの文書へのリンクは `https://github.com/shkobayashi/schedule-viewer/blob/main/docs/...` に付け替える。fragment は残す
5. 見出しの `id` は `github-slugger` で付ける。ページごとに slugger をリセットする。Jekyll の見出し id は使わない

## ビルド

1. `npm run build:manual-site` が `site/` を作る。出力は git に含めない（[`.gitignore`](../../../.gitignore)）
2. ビルドは、マニュアル内の fragment が生成した id にあること、開発ガイドなどへの fragment が相手の見出しから同じ規則で作れること、画像ファイルがあることを確認する。欠けるときはファイル名とリンクを出して失敗する
3. 依存は `marked` と `github-slugger` の devDependencies である
4. 全機能（`features.html`）だけ、見出しを HTML にするのと同じ `github-slugger` の走査で h2 と h3 を集め、導入段落の直後・最初の h2 の前に「このページ」の目次を挿入する。Markdown には目次を書かない。はじめに・チュートリアル・入口には出さない

## ワークフロー

1. [.github/workflows/pages.yml](../../../.github/workflows/pages.yml) は `main` への push（マニュアル、ビルド入力、ワークフロー定義が変わったとき）と `workflow_dispatch` で動く
2. 権限はワークフロー全体 `contents: read`、deploy ジョブだけ `pages: write` と `id-token: write`。環境は `github-pages`
3. Release ワークフローには足さない
4. リポジトリの Pages の Source は GitHub Actions（`build_type=workflow`）である

## 文書

[AGENTS.md](../../../AGENTS.md) の「変更したら文書も更新する」に従う。手順と CI の説明は [docs/development.md](../../../docs/development.md)。CI の表は [docs/test-spec.md](../../../docs/test-spec.md)。`scripts/` の説明は [docs/internal-spec.md](../../../docs/internal-spec.md)。方針は [docs/PLANNING.md](../../../docs/PLANNING.md)。公開 URL は [README.md](../../../README.md) と [docs/user-manual.md](../../../docs/user-manual.md)

## 確認

1. `npm run build:manual-site` を通す
2. `site/` をローカルの HTTP サーバで開き、相互リンク、見出し fragment、画像、GitHub への外部リンクを確認する。全機能では目次から h2 と h3 へ飛べること、他ページの `features.html#…` が今までどおり開くこと、はじめにとチュートリアルに目次が無いことを確認する
3. マニュアル公開の変更では `npm run lint` を通す

## 完了条件

- 計画したビルドとワークフローが入っている
- 対応する文書が同じ変更に含まれている
- `npm run build:manual-site` と `npm run lint` が通っている
