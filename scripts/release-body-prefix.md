## ダウンロード

- **Ubuntu (22.04 以降, amd64)**: `schedule-viewer_*_amd64.deb` をダウンロードし、`sudo apt install ./schedule-viewer_*_amd64.deb` でインストール。ベータの deb を入れたあとに安定版へ移すときは、先にベータの deb を外す
- **Windows (x64)**: [Microsoft Store](https://apps.microsoft.com/detail/9PP41TRJ8ZT8) から入手する。更新は Windows が行う
- **macOS (Apple Silicon)**: `schedule-viewer_*_aarch64.dmg` をダウンロードし、ディスクイメージを開いて schedule-viewer をアプリケーションフォルダへ入れる。dmg の中の .app からは起動しない

### macOS の初回起動

ブラウザや GitHub から落とした dmg には隔離属性が付き、アプリケーションフォルダへコピーした .app にも付く。初回の起動では Gatekeeper が止めることがある。止まったあと、システム設定の「プライバシーとセキュリティ」に「このまま開く」があれば、それを選んで開く。「このまま開く」が無く、壊れていると出るときは、次を実行してから開く。

```bash
xattr -dr com.apple.quarantine /Applications/schedule-viewer.app
```

Gatekeeper 自体は切らない。

ローカルでのビルド手順は [開発ガイド](https://github.com/shkobayashi/schedule-viewer/blob/main/docs/development.md#配布用ビルド) を参照してください。
