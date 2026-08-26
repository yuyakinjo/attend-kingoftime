# SETUP: 初回セットアップ

リポジトリを取得してから、Raycast に打刻ボタンが表示されるまでの手順。

## 0. 前提確認

```sh
bun --version   # 1.4.0 以上
gh auth status  # 認証済みであること
```

- `bun` が無い → `curl -fsSL https://bun.sh/install | bash`
- `gh` が未認証 → `gh auth login`
- Raycast が未インストール → https://raycast.com からインストール

## 1. Raycast 用のワークスペースへ移動

clone 先の親ディレクトリへ移動する。

```sh
cd <your workspace>
```

## 2. clone

```sh
gh repo clone yuyakinjo/attend-kingoftime
cd attend-kingoftime
```

すでにディレクトリが存在する場合は clone せず、`UPDATE.md` の手順に切り替える。

## 3. 依存パッケージのインストール

```sh
bun install --frozen-lockfile
```

`--frozen-lockfile` が lockfile 不一致で失敗した場合のみ `bun install` を実行する。

## 4. 開発ビルド（Raycast への登録）

```sh
bun run dev
```

- `ray develop` が起動し、ビルド成果物が Raycast に登録される。
- ビルドが通るまで（`built extension successfully` 相当の出力が出るまで）起動したままにする。
- 手順 5・6 の確認が終わるまでは停止しない。

## 5. 確認

- ユーザーに Raycast を開いてもらい、`King of Time 打刻` で検索してコマンドが表示されればセットアップ完了。

## 6. 初回起動時の設定

コマンドを初めて実行すると Raycast の Preferences で King of Time のログイン情報の入力を求められる。表示に従って入力する（設定値は `src/configuration.ts` を参照）。

## 7. 終了

確認まで完了したら `bun run dev` を終了してよい。一度登録されたコマンドは Raycast に残るため、終了してもコマンドは消えない。

## トラブルシュート

| 症状                       | 対処                                                   |
| -------------------------- | ------------------------------------------------------ |
| Raycast にコマンドが出ない | `bun run dev` がビルド成功まで到達したか確認し、再実行 |
| `ray: command not found`   | `bun install` が未完了。手順 3 をやり直す              |
| Node バージョンエラー      | Node 22.22.2 以上が必要（`package.json` の `engines`） |
