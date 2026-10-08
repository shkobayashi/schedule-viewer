# 開発ガイド

開発者向けの手順である。画面の挙動は [外部仕様](external-spec.md) に、JSON の形は [データ仕様](data-format.md) と `docs/*.schema.json` に定める。

## 必要なバージョン

開発中の起動と配布用ビルドは、同じ Node.js と Rust を使う。

- **Node.js**: 24（`.nvmrc`。`package.json` の `engines` は `>=24 <25`）
- **Rust**: 1.98.1（`rust-toolchain.toml`）
- Tauri identifier: `com.collabcentral.schedule-viewer`

`npm run dev` は Node.js だけで動く。`npm run tauri dev` と `npm run tauri build` には、Rust と、下の各 OS の追加パッケージも必要である。

Node.js はバージョンマネージャで入れる。Linux と macOS は [nvm](https://github.com/nvm-sh/nvm)（v0.40.7）を使う。Windows は別プログラムの [nvm-windows](https://github.com/coreybutler/nvm-windows) を使う。コマンド名はどちらも `nvm` である。`.nvmrc` の中身は `24` である。Linux と macOS の nvm は、リポジトリ直下の `nvm install` がこのファイルを読む。nvm-windows は `.nvmrc` を読まないので、バージョン `24` を引数で指定する。

Rust は [rustup](https://rustup.rs/) で入れる。このリポジトリに入ると `rust-toolchain.toml` の 1.98.1 がダウンロードされる。

## 開発環境

### Ubuntu

Ubuntu 22.04 以降。WSL2 の Ubuntu もこの手順で入れる。

先に Tauri がリンクするシステムパッケージを入れる。この中の `curl` は、続く nvm と rustup の取得にも使う。

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  xdg-utils
```

nvm を入れる。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
```

新しいターミナルを開く。リポジトリ直下で Node.js 24 を入れ、バージョンを確認する。

```bash
cd /path/to/schedule-viewer
nvm install
node -v
```

`node -v` が `v24` で始まればよい。

rustup を入れる。選択肢が出たら `1`（default）を選ぶ。

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

インストール直後の同じターミナルで続けるときは、次で cargo を PATH に載せる。新しいターミナルを開けば、rustup が追記したシェル設定で有効になる。

```bash
. "$HOME/.cargo/env"
```

リポジトリ直下で確認する。初回は 1.98.1 の取得に時間がかかる。

```bash
rustc --version
```

`rustc 1.98.1` と出ればよい。

### macOS

macOS Catalina (10.15) 以降。Command Line Tools を入れる。デスクトップアプリのビルドに Xcode 本体は不要である。

```bash
xcode-select --install
```

nvm を入れる。macOS には `curl` が入っている。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
```

新しいターミナルを開く。リポジトリ直下で Node.js 24 を入れ、バージョンを確認する。

```bash
cd /path/to/schedule-viewer
nvm install
node -v
```

`node -v` が `v24` で始まればよい。

rustup を入れる。選択肢が出たら `1`（default）を選ぶ。

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

インストール直後の同じターミナルで続けるときは、次で cargo を PATH に載せる。新しいターミナルを開けば、rustup が追記したシェル設定で有効になる。

```bash
. "$HOME/.cargo/env"
```

リポジトリ直下で確認する。初回は 1.98.1 の取得に時間がかかる。

```bash
rustc --version
```

`rustc 1.98.1` と出ればよい。

### Windows

Windows 10（バージョン 1803 以降）または Windows 11。

1. [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) を入れ、インストール時に「Desktop development with C++」を選ぶ。Tauri は Rust のクレートを MSVC でリンクする。
2. WebView2 は Windows 10（1803 以降）と Windows 11 に入っている。入っていない場合は Evergreen Bootstrapper を入れる。
3. 別経路で入れた Node.js がある場合は、先にアンインストールする。PATH が nvm-windows と衝突する。
4. [nvm-windows の最新リリース](https://github.com/coreybutler/nvm-windows/releases) から `nvm-setup.exe` を実行する。管理者の PowerShell を新しく開き、Node.js 24 を入れる。`node -v` が `v24` で始まればよい。

```powershell
nvm install 24
nvm use 24
node -v
```

5. [rustup](https://rustup.rs/) の `rustup-init.exe` を実行する。default host は、通常の PC では `x86_64-pc-windows-msvc`、ARM の Windows では `aarch64-pc-windows-msvc` にする。新しい PowerShell を開き、リポジトリ直下で確認する。初回は 1.98.1 の取得に時間がかかる。`rustc 1.98.1` と出ればよい。

```powershell
rustc --version
```

## リポジトリでの起動

[開発環境](#開発環境) の手順が終わってから、リポジトリ直下で依存を入れる。

```bash
npm install
```

`npm run tauri dev` で `Cannot find native binding` / `@tauri-apps/cli-darwin-arm64` と出る場合は、Linux の DevContainer など別 OS で作った `node_modules` を macOS で使っていることが多い。リポジトリ直下で `node_modules` を消してから、**macOS 上で** 入れ直す。

```bash
rm -rf node_modules
npm install
```

それでも直らないときは、次を試す。

```bash
npm install @tauri-apps/cli-darwin-arm64@2.12.1
```

（Apple Silicon 以外の Mac では `cli-darwin-x64` に読み替える。）

フロントのみ（ブラウザで Konva 確認）。ポートは 5173 である。

```bash
npm run dev
```

デスクトップアプリ（ウィンドウ起動はホスト OS 上で行う）。こちらはポート 1420 を使うので、上のブラウザ版と同時に起動できる。

```bash
npm run tauri dev
```

## DevContainer

DevContainer で開発する場合は、コンテナ内の Node.js 24 と Rust 1.98.1 を使う。VS Code / Cursor で「Reopen in Container」を選ぶ。コンテナ内でも `npm run tauri build` で Linux 向けパッケージは作れる。ウィンドウを開いての動作確認は、ディスプレイがあるホスト OS 側で行う。

## npm スクリプト

| スクリプト | 内容 |
| --- | --- |
| `npm run dev` | 検証器を生成してから Vite でフロントを起動する（ポート 5173）。`tauri dev` から呼ばれたときはポート 1420 |
| `npm run build` | 検証器の生成、`tsc`、Vite の本番ビルド |
| `npm run preview` | 本番ビルドのプレビュー |
| `npm run tauri` | Tauri CLI を呼ぶ。後ろに `dev` や `build` を付けて使う |
| `npm test` | 検証器を生成してから Vitest を1回実行する |
| `npm run lint` | ESLint |
| `npm run check:schedule` | 引数なしなら `src/sample/schedule.ts` のサンプルを検証する。JSON のパスを渡すとそのファイルを検証する。`examples/playground.schedule.json` は引数なしでは見ない |
| `npm run check:calendar` | 引数なしなら `examples/jp-2026.calendar.json` を検証する |
| `npm run check:members` | 引数なしなら `examples/playground.members.json` を検証する |
| `npm run build:validate-skill` | `write-schedule`、`write-calendar`、`write-members` に同梱する検証スクリプトと、スキーマのコピーを作り直す |
| `npm run version:check` | バージョン番号が5ファイルで揃っていることを確認する |
| `npm run version:bump` | バージョンを上げる。`major`、`minor`、または `patch` を引数にする |
| `postinstall` | `@tauri-apps/cli` のその OS 向けバイナリがあることを確認する |

## ブランチと CI

ブランチ運用は `develop`（開発）と `main`（リリース）の二本立てである。`feature-*` などは `develop` から切り、マージ先も `develop` である。

| トリガー | ワークフロー | 内容 |
| --- | --- | --- |
| `develop` または `main` 向けの pull request | CI（`.github/workflows/ci.yml`） | 変更パスに応じてフロントと Rust を分け、集約ジョブ `ci` で結果をまとめる |
| `main` への push | Release（`.github/workflows/release.yml`） | 環境 `release` の承認のあと、Ubuntu (deb) と Windows (NSIS) をビルドし GitHub Release へ公開 |

`develop` への push だけでは CI は動かない。CI が動くのは `develop` または `main` 向けの pull request のときである。

CI は変更されたパスでジョブを分ける。ビルドの入力を足したら、ここと `.github/workflows/ci.yml` の対象パスにも足す。Rust の版の正本は `rust-toolchain.toml` で、ワークフローには版番号を書かない。`dtolnay/rust-toolchain` は `toolchain` の入力が必須で、このファイルを自分では読まない。CI と Release は `channel` と `components` を読んでその入力へ渡す。読み取りステップは `shell: bash` にする。Release の Windows ランナーの既定シェルは PowerShell で、bash のまま書くと構文エラーになる。Release は配布物のビルドと公開だけで、検査は繰り返さない。`main` へ載せる前の `version:check` は手元で行う。

- `src-tauri/` または `rust-toolchain.toml` が変わると Rust ジョブ（Clippy と `cargo test --locked`）が動く
- `index.html`、`src/`、`scripts/`、スキーマ、`examples/`、パッケージ定義、フロントの設定、`.cursor/skills/write-schedule/`、`.cursor/skills/write-calendar/`、`.cursor/skills/write-members/` が変わるとフロントジョブが動く。中身は `version:check`、`build`、`lint`、`test`、`check:schedule`、`check:calendar`、`check:members`、`build:validate-skill`、スキル同梱物と `src/model/generated/` の差分検査である
- ワークフロー定義が変わると、両方のジョブが動く
- `docs/*.md` や `README.md` だけの変更では、フロントと Rust はスキップする。集約ジョブ `ci` は成功する

ワークフロー全体の `permissions` は `contents: read` である。Release の `contents: write` は配布ジョブだけに付ける。`actions/checkout` は `persist-credentials: false` である。

## GitHub のセキュリティ設定

リポジトリを公開する前に、次をリポジトリ設定で入れる（非公開のままでも設定できる）。

| 項目 | 推奨 |
| --- | --- |
| Actions の一般権限 | Read repository contents |
| Actions による pull request の作成・承認 | オフ |
| アクションの SHA 固定 | 必須 |
| Wiki | オフ |

公開したあと、ruleset で `develop` と `main` に pull request 必須、コードオーナーのレビュー、必須ステータスチェック `ci`、force push と削除の禁止を入れる。タグ `v*` は更新と削除を禁止する。詳細はリポジトリの **Settings → Rules → Rulesets** である。非公開の Free プランでは ruleset を作れない。公開の直後に設定する。

Dependabot は [`.github/dependabot.yml`](../.github/dependabot.yml) で npm、cargo、github-actions を週次に見る。脆弱性の報告は [SECURITY.md](../SECURITY.md) に従う。

Release ワークフローは GitHub 環境 `release` を使う。環境は **Settings → Environments → release** で作る。Required reviewers は、プランによっては非公開リポジトリでは使えない。使えないときは承認なしで Release が走る。使えるときは管理者を Required reviewers に入れ、Actions が自分で承認できない設定にする。

### コミットのメールアドレス

GitHub の **Settings → Emails** で、コミット用の noreply アドレス（`49135353+shkobayashi@users.noreply.github.com`）を有効にする。

このリポジトリだけ noreply を使う例:

```bash
git config --local user.email '49135353+shkobayashi@users.noreply.github.com'
git config --local user.name 'shkobayashi'
```

履歴に残したくないメールを直すときは、mirror のバックアップを取ったあと `git filter-repo` を使う。mailmap の形式は **正本（左）→ 履歴に残っているアドレス（右）** である。

```
shkobayashi <49135353+shkobayashi@users.noreply.github.com> shkobayashi <shkobayashi@abeam.com>
```

書き換え後は `main`、`develop`、必要なブランチとタグ `v*` を force push する。`git push --mirror` は使わない。手元のクローンは `git fetch origin --prune` のあと `git reset --hard origin/develop` などで揃える。

force push のあとも、マージ済み pull request や GitHub のキャッシュから古いコミットが辿れることがある。公開前に [Remove cached views and references to sensitive data](https://support.github.com/contact?tags=rr-remove-sensitive-data) から削除を依頼する。

### リポジトリを public にする

```bash
gh repo edit shkobayashi/schedule-viewer --visibility public
```

公開後は、Dependabot alerts、secret scanning、Code scanning（既定セットアップ）、非公開の脆弱性報告を有効にする。フォークからの pull request でワークフローを走らせるときは、初回は承認が要る設定にする。

## リリースとバージョン

### ダウンロード

メンバー向けの配布物は [GitHub Releases](https://github.com/shkobayashi/schedule-viewer/releases) から取得する。

- **Ubuntu 22.04 以降 (amd64)**: `schedule-viewer_X.Y.Z_amd64.deb` をダウンロードし、`sudo apt install ./schedule-viewer_X.Y.Z_amd64.deb`
- **Windows (x64)**: `schedule-viewer_X.Y.Z_x64-setup.exe` を実行

macOS 用の自動ビルドはまだない。必要なときは下の「配布用ビルド」でローカルビルドする。

### Windows のコード署名

GitHub Release の Windows インストーラ（NSIS）へ、自己署名とタイムスタンプを付ける。秘密鍵はリポジトリに置かず、GitHub の secret に置く。公開用の証明書（`.cer`）は各 Release に添付する。知り合いの PC で発行元を示すための手順である。有料のコード署名証明書は使わない。

初回だけ、次の手順を上から順に実行する。証明書を作るのは、使っている OS の見出しだけを選び、もう一方は飛ばす。

1. 作業用のディレクトリを、リポジトリの外に作る。`.pfx` と秘密鍵はここにだけ置く。

```bash
mkdir -p "$HOME/schedule-viewer-codesign"
cd "$HOME/schedule-viewer-codesign"
```

Windows の PowerShell では、次のようにする。

```powershell
New-Item -ItemType Directory -Force -Path "$HOME\schedule-viewer-codesign" | Out-Null
Set-Location "$HOME\schedule-viewer-codesign"
```

#### Windows で証明書を作る

管理者の PowerShell で、作業ディレクトリにいることを確認してから、次を順に実行する。

2. コード署名用の自己署名証明書を作る。表示名は `schedule-viewer`、有効期限は 5 年である。

```powershell
$cert = New-SelfSignedCertificate `
  -Subject "CN=schedule-viewer" `
  -KeyAlgorithm RSA `
  -KeyLength 3072 `
  -HashAlgorithm SHA256 `
  -NotAfter (Get-Date).AddYears(5) `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -Type CodeSigningCert
$cert.Thumbprint
```

`Thumbprint` が 40 文字の英数字で表示されれば、このステップは完了である。メモしておく（あとでストアから証明書を消すときに使う）。

3. エクスポート用のパスワードを決める。GitHub secret `WINDOWS_CERTIFICATE_PASSWORD` に入れる値である。画面には出さない。

```powershell
$exportPassword = Read-Host "Export password (for WINDOWS_CERTIFICATE_PASSWORD)" -AsSecureString
```

4. 秘密鍵付きの `.pfx` を書き出す。

```powershell
Export-PfxCertificate `
  -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" `
  -FilePath "$HOME\schedule-viewer-codesign\schedule-viewer-codesign.pfx" `
  -Password $exportPassword
```

`schedule-viewer-codesign.pfx` ができていれば、このステップは完了である。

5. CI が復元する形式のテキストにする。

```powershell
certutil -encode "$HOME\schedule-viewer-codesign\schedule-viewer-codesign.pfx" "$HOME\schedule-viewer-codesign\schedule-viewer-codesign.pfx.txt"
```

`schedule-viewer-codesign.pfx.txt` の先頭が `-----BEGIN`、末尾が `-----END` で終わっていれば、このステップは完了である。

#### macOS で証明書を作る

ターミナルで、作業ディレクトリにいることを確認してから、次を順に実行する。

2. 秘密鍵と証明書を作る。表示名は `schedule-viewer`、有効期限は 5 年である。

```bash
openssl req -x509 -newkey rsa:3072 -sha256 -days 1825 -nodes \
  -keyout schedule-viewer-codesign.key.pem \
  -out schedule-viewer-codesign.cert.pem \
  -subj "/CN=schedule-viewer" \
  -addext "keyUsage=digitalSignature" \
  -addext "extendedKeyUsage=codeSigning"
```

`schedule-viewer-codesign.key.pem` と `schedule-viewer-codesign.cert.pem` ができていれば、このステップは完了である。

3. エクスポート用のパスワードを決める。GitHub secret `WINDOWS_CERTIFICATE_PASSWORD` に入れる値である。

4. 秘密鍵付きの `.pfx` を書き出す。パスワードの入力を求められたら、手順 3 の値を入れる。

```bash
openssl pkcs12 -export \
  -inkey schedule-viewer-codesign.key.pem \
  -in schedule-viewer-codesign.cert.pem \
  -out schedule-viewer-codesign.pfx
```

`schedule-viewer-codesign.pfx` ができていれば、このステップは完了である。

5. CI の `certutil -decode` で `.pfx` に戻せるテキストにする。`BEGIN CERTIFICATE` から `END CERTIFICATE` までを含める。

```bash
{
  echo "-----BEGIN CERTIFICATE-----"
  openssl base64 -in schedule-viewer-codesign.pfx | fold -w 64
  echo "-----END CERTIFICATE-----"
} > schedule-viewer-codesign.pfx.txt
```

`schedule-viewer-codesign.pfx.txt` の先頭が `-----BEGIN CERTIFICATE-----`、末尾が `-----END CERTIFICATE-----` であれば、このステップは完了である。

#### secret を登録する

6. リポジトリのルートで、GitHub CLI が `shkobayashi/schedule-viewer` を指していることを確認する。`schedule-viewer-codesign.pfx.txt` の**中身全体**を secret `WINDOWS_CERTIFICATE` に入れる。

```bash
cd /path/to/schedule-viewer
gh secret set WINDOWS_CERTIFICATE < "$HOME/schedule-viewer-codesign/schedule-viewer-codesign.pfx.txt"
```

7. 手順 3 で決めたパスワードを secret `WINDOWS_CERTIFICATE_PASSWORD` に入れる。引数にパスワードを書かず、プロンプトへ入力する。

```bash
gh secret set WINDOWS_CERTIFICATE_PASSWORD
```

8. 登録を確認する。値は表示されない。次の一覧に `WINDOWS_CERTIFICATE` と `WINDOWS_CERTIFICATE_PASSWORD` があれば、このステップは完了である。

```bash
gh secret list
```

Release ワークフローは、ビルド前に `.pfx` を復元し、証明書ストアへ取り込んだあと、Tauri が NSIS へ署名する。拇印は `src-tauri/tauri.conf.json` には書かず、CI だけが渡す。タイムスタンプは `http://timestamp.digicert.com`（RFC 3161）を使う。証明書の期限のあとでも、署名は有効なままである。

9. 作業ディレクトリの `.pfx`、`.pfx.txt`、秘密鍵（`.pem`）を消す。

```bash
rm -f "$HOME/schedule-viewer-codesign/"*.pfx "$HOME/schedule-viewer-codesign/"*.pfx.txt "$HOME/schedule-viewer-codesign/"*.pem
```

Windows で個人ストアへ証明書を入れた場合は、手順 2 の拇印を指定して消す。

```powershell
Remove-Item "Cert:\CurrentUser\My\<Thumbprint>"
Remove-Item -Force "$HOME\schedule-viewer-codesign\schedule-viewer-codesign.pfx", "$HOME\schedule-viewer-codesign\schedule-viewer-codesign.pfx.txt" -ErrorAction SilentlyContinue
```

次は、下の「`main` に載せる前のバージョン上げ」である。`main` へ載せる時点で secret が無いと、Windows の Release ジョブは署名に失敗する。

### 更新用の署名鍵

GitHub Release の deb と NSIS に、Tauri アップデータ用の署名を付ける。秘密鍵はリポジトリに置かず、GitHub の secret に置く。公開鍵は [src-tauri/tauri.conf.json](../src-tauri/tauri.conf.json) の `plugins.updater.pubkey` に書く。これは Windows のコード署名（`WINDOWS_CERTIFICATE`）とは別の鍵である。

初回だけ、次の手順を上から順に実行する。

1. 作業用のディレクトリを、リポジトリの外に作る。

```bash
mkdir -p "$HOME/schedule-viewer-updater"
```

2. リポジトリ直下で鍵を発行する。パスワードを聞かれたら、空のまま Enter を押す。この鍵にパスワードは付けない。

```bash
cd /path/to/schedule-viewer
npm run tauri signer generate -- -w "$HOME/schedule-viewer-updater/schedule-viewer-updater.key"
```

`schedule-viewer-updater.key` ができ、公開鍵の文字列が表示されれば、このステップは完了である。表示された公開鍵だけを `plugins.updater.pubkey` に書く。秘密鍵の中身は、設定ファイル、コミット、Issue には残さない。

3. `gh` が `shkobayashi/schedule-viewer` を指していることを確認する。秘密鍵ファイルの中身全体を secret `TAURI_SIGNING_PRIVATE_KEY` に入れる。`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` は置かない。空の値を渡すと、署名の段階でパスワードが無いとして失敗する。

```bash
gh repo view --json nameWithOwner --jq .nameWithOwner
gh secret set TAURI_SIGNING_PRIVATE_KEY < "$HOME/schedule-viewer-updater/schedule-viewer-updater.key"
```

4. 登録を確認する。値は表示されない。一覧に `TAURI_SIGNING_PRIVATE_KEY` があれば、このステップは完了である。

```bash
gh secret list
```

5. 作業ディレクトリの秘密鍵を消す。

```bash
rm -f "$HOME/schedule-viewer-updater/schedule-viewer-updater.key" "$HOME/schedule-viewer-updater/schedule-viewer-updater.key.pub"
```

Release ワークフローは、ビルド前に `TAURI_SIGNING_PRIVATE_KEY` が空でないことを確認し、`src-tauri/tauri.release.json` で `createUpdaterArtifacts` を有効にする。パスワード用の環境変数は渡さない。各 OS ジョブは `latest-linux-x86_64.json` または `latest-windows-x86_64.json` を Release に載せ、`checksums` ジョブが `latest.json` にまとめる。手元の `npm run tauri build` は、更新用の署名ファイルを作らない。

`main` へ載せる時点でこの secret が無いと、Release ジョブは失敗する。

### `main` に載せる前のバージョン上げ

Windows の NSIS を署名する変更を `main` に載せるときは、先に「Windows のコード署名」の secret 登録が終わっていること。自動更新を含む変更を載せるときは、「更新用の署名鍵」の secret 登録も終わっていること。

`develop` を `main` にマージする直前に、リポジトリ直下でバージョンを1回だけ上げる。

- 公開する契約を次のメジャーまで守るとき: `npm run version:bump -- major`
- 前回リリース以降に feature が入っている: `npm run version:bump -- minor`
- fix だけのとき: `npm run version:bump -- patch`

`npm run version:check` で `package.json` / `package-lock.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml` / `src-tauri/Cargo.lock` の番号が揃っていることを確認してから、そのコミットを `develop` に入れて `main` にマージする。`main` へ push されると `vX.Y.Z` タグ付きの Release が作られる。同じバージョンのタグが既にある場合は、先にバージョンを上げてから再度マージする。

変更の要約は、そのバージョン上げのコミットで [CHANGELOG.md](../CHANGELOG.md) に書く。公開する版の節へ移すときは、各項目の末尾に対応する Issue 番号を `(#番号)` の形で書く。番号が複数あるときは `(#155) (#156)` のように並べる。`[Unreleased]` の項目には書かなくてよい。

Release ワークフローは、各 OS のビルドが同じダウンロード手順だけを `releaseBody` に載せる。`checksums` ジョブが [scripts/build-release-notes.ts](../scripts/build-release-notes.ts) で接頭文のあとにその版の CHANGELOG 節を足し、`gh release edit` で本文を確定する。節の項目に Issue 番号が無いときはジョブが失敗し、本文はダウンロード手順のまま残る。

### Release 後に証明書を入れる

`main` への push で Release ができたあと、知り合いの Windows PC で次を上から順に実行する。証明書を入れた PC だけで、インストーラの発行元が `schedule-viewer` と表示される。入れていない PC では、これまでどおり SmartScreen の確認が出る。

1. [GitHub Releases](https://github.com/shkobayashi/schedule-viewer/releases) から、対象の版を開き、`schedule-viewer-codesign.cer` をダウンロードする。

2. 管理者の PowerShell で、ダウンロードした `.cer` を「信頼されたルート証明機関」と「信頼された発行元」の両方へ入れる。

```powershell
$cer = "C:\path\to\schedule-viewer-codesign.cer"
Import-Certificate -FilePath $cer -CertStoreLocation Cert:\LocalMachine\Root
Import-Certificate -FilePath $cer -CertStoreLocation Cert:\LocalMachine\TrustedPublisher
```

エラーが出ず、両方のストアに `schedule-viewer` が見えれば、このステップは完了である。ルートへの取り込みが拒否されたときは、「Windows のコード署名」の証明書を作り直し、secret を差し替えてから Release を出す。

3. 同じ Release の `schedule-viewer_*_x64-setup.exe` を実行し、プロパティまたは実行時の表示で発行元が `schedule-viewer` になることを確認する。

## アプリアイコン

ランチャー用の原画は `src-tauri/icons/icon.svg`（1024px）である。Mac、Windows、Ubuntu は同じ絵を使う。地は画面のインディゴ（`#4C5FD5`）の角丸で、キャンバスの端までは塗らない。白い横棒はガントの一行、その上を横切る短いコーラル（`#E2542A`）は今日の線である。文字と目盛りは入れない。光は左上からだけにして、面に薄いハイライトを乗せる。

絵を変えたときは、リポジトリ直下で次を実行する。

```bash
npm run tauri icon src-tauri/icons/icon.svg
rm -rf src-tauri/icons/android src-tauri/icons/ios
```

このコマンドが、`src-tauri/tauri.conf.json` の `bundle.icon` にある PNG と `icon.icns`、`icon.ico`、Windows 用の Square ロゴを原画から作り直す。`android` と `ios` も同時にできる。配布はデスクトップだけなので、その二つのディレクトリは削除する。macOS 26 の Icon Composer 用レイヤーは、三つの OS でこの一枚が使えることを確認してから別に足す。

## 配布用ビルド

パッケージは、動かしたい OS の上で作る。Mac 用は Mac、Windows 用は Windows、Ubuntu 用は Ubuntu でビルドする。できたファイルの CPU は、ビルドしたマシンと同じになる。一般的な PC は x86_64、Apple Silicon の Mac は arm64 である。

[開発環境](#開発環境) で、ビルドする OS の Node.js、Rust、追加パッケージを入れてから、リポジトリ直下で次を実行する。

```bash
npm install
npm run tauri build
```

成果物は `src-tauri/target/release/bundle/` に出る。ファイル名に入るバージョンは [`npm run version:check`](#main-に載せる前のバージョン上げ) で揃えている番号である。初回は依存のコンパイルで時間がかかる。

配布パッケージには `.cursor/skills/write-schedule/`、`.cursor/skills/write-members/`、`.cursor/skills/write-calendar/` が `json-skills/` として同梱される。deb や NSIS などのインストーラーは、これらをホームやプロジェクトへコピーしない。利用者が置くのは、デスクトップ版の設定「JSON作成スキルを置く」からである。

### Ubuntu

Ubuntu 22.04 以降。システムパッケージは [Ubuntu の開発環境](#ubuntu) で入れてある。

`npm run tauri build` のあと、deb を入れて起動する。x86_64 の例:

```bash
sudo apt install ./src-tauri/target/release/bundle/deb/schedule-viewer_X.Y.Z_amd64.deb
schedule-viewer
```

arm64 でビルドしたときは `schedule-viewer_X.Y.Z_arm64.deb` になる。DevContainer を Apple Silicon 上の Linux で使っている場合は arm64 向けになる。配布先の Ubuntu が x86_64 なら、そのマシンでビルドする。

インストールせずに起動する AppImage もできる。x86_64 では `x86_64`、arm64 では `aarch64` がファイル名に入る。

```bash
chmod +x src-tauri/target/release/bundle/appimage/schedule-viewer_X.Y.Z_x86_64.AppImage
./src-tauri/target/release/bundle/appimage/schedule-viewer_X.Y.Z_x86_64.AppImage
```

同じビルドで RPM も `bundle/rpm/` にできる。Ubuntu では deb を使う。

### macOS

macOS Catalina (10.15) 以降。Command Line Tools、Node.js、Rust は [macOS の開発環境](#macos) で入れてある。

`npm run tauri build` のあと、ビルドした Mac で起動する:

```bash
open src-tauri/target/release/bundle/macos/schedule-viewer.app
```

ほかの Mac に渡すときは、ディスクイメージを開いて Applications に入れる。

- Apple Silicon: `src-tauri/target/release/bundle/dmg/schedule-viewer_X.Y.Z_aarch64.dmg`
- Intel: `src-tauri/target/release/bundle/dmg/schedule-viewer_X.Y.Z_x64.dmg`

別の Mac へ渡すには、Apple の署名と公証が必要になる。ビルドした Mac 上の `.app` はそのまま開ける。

### Windows

Windows 10（バージョン 1803 以降）または Windows 11。C++ Build Tools、WebView2、Node.js、Rust は [Windows の開発環境](#windows) で入れてある。

`npm run tauri build` のあと、できたインストーラを実行し、スタートメニューの schedule-viewer から起動する。x86_64 の例:

- `src-tauri\target\release\bundle\nsis\schedule-viewer_X.Y.Z_x64-setup.exe`
- `src-tauri\target\release\bundle\msi\schedule-viewer_X.Y.Z_x64_en-US.msi`

ARM の Windows では `x64` の部分が `arm64` になる。インストーラを使わず、ビルドした PC でそのまま試す場合:

```powershell
.\src-tauri\target\release\schedule-viewer.exe
```

手元の `npm run tauri build` ではインストーラへ署名しない。署名するのは GitHub Release の NSIS である。公開用証明書の入れ方は、上の「Release 後に証明書を入れる」にある。

MSI の作成で `failed to run light.exe` と出たときは、Windows のオプション機能で VBSCRIPT を有効にする。

## スキーマを変えるとき

スケジュール JSON の形を変えるときは [.cursor/skills/update-schedule-schema/SKILL.md](../.cursor/skills/update-schedule-schema/SKILL.md) に従う。スキーマの正本、型、意味規則（スキーマでは表せない検証）、サンプル、`write-schedule` スキルを同じ変更で揃える。

カレンダー JSON を変えるときも、`docs/calendar.schema.json`、アプリの検証、`.cursor/skills/write-calendar/` を揃える。メンバー JSON も同様に `docs/members.schema.json`、アプリの検証、`.cursor/skills/write-members/` を揃える。

検証器は `scripts/compile-validators.mjs` がスキーマから `src/model/generated/` へ生成する。`npm run dev`、`npm run build`、`npm test` は先にこれを実行する。スキルに同梱する検証スクリプトは `npm run build:validate-skill` で作り直す。CI のフロントジョブは、生成後の `src/model/generated/` とスキル同梱物がコミット済みの内容と一致することを `git diff --exit-code` で見る。

## ドキュメントの更新ルール

挙動や手順を変えたら、対応する文書を同じ変更に含める。

| 変えたもの | 直す文書 |
| --- | --- |
| 画面の操作や見た目 | [外部仕様](external-spec.md) と [操作マニュアル](user-manual.md) |
| スケジュール、メンバー、カレンダーの JSON | [データ仕様](data-format.md) と、対応するスキル（`write-schedule`、`write-members`、`write-calendar`） |
| Tauri コマンド、状態の持ち方、ディレクトリ構成 | [内部仕様](internal-spec.md) |
| 自動テストや手動で確かめる手順 | [テスト仕様](test-spec.md) |
| 開発環境、起動、CI、リリース | この文書 |
| リリースに載せる変更 | [CHANGELOG.md](../CHANGELOG.md) |

計画と経緯は [PLANNING.md](PLANNING.md) に残す。画面の挙動の説明は外部仕様に書き、PLANNING には繰り返さない。
