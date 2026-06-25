---
title: 検証と協作
description: pnpm コマンド、検証境界、Git 協作、dirty worktree の保護。
order: 70
category: project
navigation:
  icon: check-circle
---

# 検証と協作

リポジトリでは pnpm だけを使います。宣言された package manager は `pnpm@10.22.0` で、よく使うコマンドはプロジェクトルートから実行します。

## コマンド

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
pnpm preview
```

現在このリポジトリには committed な `lint` script がありません。後で追加されるか、タスクで明示されない限り、lint 検証済みとは言いません。

## 検証タイミング

TypeScript、Vue、route、composable、store を変更したら `pnpm typecheck` を実行します。Nuxt config、server route、runtime config、build-sensitive module を変更したら `pnpm build` を実行します。

見える UI 変更はできるだけブラウザで desktop と mobile 幅を確認します。特にテキスト折り返し、focus、drawer、overlay、小画面レイアウトを見ます。

## Git 協作

編集前に worktree status を確認します。ユーザー変更や無関係な dirty file は戻しません。ユーザーが明示しない限り、commit、branch 作成、push はしません。
