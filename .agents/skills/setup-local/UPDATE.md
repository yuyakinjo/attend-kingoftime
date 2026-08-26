# UPDATE: アップデート手順

すでに clone 済みのローカルを最新化し、Raycast に打刻ボタンが表示される状態まで戻す手順。

## 1. 差分の有無を確認

```sh
git status --porcelain
git fetch origin
git log --oneline HEAD..origin/main
```

- `git log` の出力が空 → 更新なし。**ここで終了**し、Raycast にコマンドが出ているかだけ確認する。
- 出力があれば更新あり → 手順 2 へ。
- `git status --porcelain` に未コミットの変更がある場合は、上書きせずユーザーに退避（`git stash` など）の可否を確認する。

## 2. 実行中の `ray develop` を停止

`bun run dev` を起動しているターミナル／バックグラウンドプロセスがあれば停止する。ビルド中のファイル書き換えを避けるため。

## 3. 最新を取り込む

```sh
git pull --ff-only origin main
```

`--ff-only` が失敗する（ローカルコミットがある）場合は、勝手に rebase／merge せずユーザーに方針を確認する。

## 4. 依存パッケージを更新

```sh
bun install --frozen-lockfile
```

`bun.lock` に差分があった場合は必須。差分が無くても実行して問題ない。

## 5. 再ビルド（Raycast への再登録）

```sh
bun run dev
```

- ビルドが通るまで（`built extension successfully` 相当の出力が出るまで）起動したままにする。
- 手順 6 の確認が終わるまでは停止しない。

## 6. 確認

- ユーザーにraycastを開き、`King of Time 打刻` で検索してコマンドが表示されればアップデート完了

## 7. 終了

確認まで完了したら `bun run dev` を終了してよい。一度登録されたコマンドは Raycast に残るため、終了してもコマンドは消えない。

## トラブルシュート

| 症状                     | 対処                                            |
| ------------------------ | ----------------------------------------------- |
| pull 後にビルドが壊れる  | `rm -rf node_modules && bun install`            |
| Raycast に古い挙動が残る | Raycast を再起動してから `bun run dev` を再実行 |
| `--ff-only` が失敗       | ローカルコミット or 分岐あり。ユーザーに確認    |
