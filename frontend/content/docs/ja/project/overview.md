---
title: プロジェクト概要
description: aoi-web はローカル mock API とブラウザ状態を中心にした frontend-first の Nuxt 4 動画コミュニティアプリです。
order: 10
category: project
navigation:
  icon: layout-dashboard
---

# プロジェクト概要

`aoi-web` は動画コミュニティ向けの frontend-first Nuxt 4 アプリです。クリエイターページ、投稿、再生、弾幕、検索、設定を扱います。現在はローカル mock API とブラウザ状態を中心にしつつ、将来の Go バックエンドに向けた DTO 契約を残しています。

## 技術スタック

- Nuxt 4、Vue 3、TypeScript、Composition API。
- クライアント状態は Pinia。
- `@nuxtjs/i18n` は三言語、デフォルト `zh-CN`、`no_prefix` ルーティング。
- `@nuxt/icon` はローカル Lucide アイコンを利用。
- Material Web はローカル Aoi wrapper からのみ公開。
- Nuxt Content が `/docs` の Markdown サイトを描画。

## プロダクト境界

現時点では本番バックエンドを実装しません。`server/api/mock/` は将来 API 契約に近いフロントエンド体験を作るための場所であり、サーバー側プロダクト機能を育てる場所ではありません。

長期的なプロダクト、アーキテクチャ、UI、API、インタラクション制約は集約リポジトリ直下の `AGENTS.md` に置きます。一時的な調査、プロトタイプ、段階計画を分散したルールファイルとして残し続けないようにします。

## 主な流れ

ホーム、検索、カテゴリ、フォロー、コレクション、履歴、再生、投稿、設定が現在の主要面です。docs は公開入口ですが、デスクトップ rail にだけ追加し、モバイル下部ナビゲーションは主要閲覧操作に集中させます。
