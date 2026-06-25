---
title: プロジェクト概要
description: aoi-web はバックエンド Community API に接続し、ローカル mock とブラウザ状態の fallback を持つ frontend-first の Nuxt 4 動画コミュニティアプリです。
order: 10
category: project
navigation:
  icon: layout-dashboard
---

# プロジェクト概要

`aoi-web` は動画コミュニティ向けの frontend-first Nuxt 4 アプリです。クリエイターページ、投稿、再生、弾幕、検索、設定を扱います。現在は `backend/internal/modules/community` の Go Community API に接続しつつ、ローカル mock API とブラウザ状態を開発・fallback 境界として残しています。

## 技術スタック

- Nuxt 4、Vue 3、TypeScript、Composition API。
- クライアント状態は Pinia。
- `@nuxtjs/i18n` は三言語、デフォルト `zh-CN`、`no_prefix` ルーティング。
- `@nuxt/icon` はローカル Lucide アイコンを利用。
- Material Web はローカル Aoi wrapper からのみ公開。
- Nuxt Content が `/docs` の Markdown サイトを描画。

## プロダクト境界

本番データ能力は `backend/internal/modules/community` が公開する契約を正とします。`server/api/mock/` はフロントエンド開発用 mock に限定し、バックエンド本番能力や権限、モデレーション、永続化ロジックの代替にしません。

長期的なプロダクト、アーキテクチャ、UI、API、インタラクション制約は集約リポジトリ直下の `AGENTS.md` に置きます。一時的な調査、プロトタイプ、段階計画を分散したルールファイルとして残し続けないようにします。

## 主な流れ

ホーム、検索、カテゴリ、フォロー、コレクション、履歴、再生、投稿、設定が現在の主要面です。docs は公開入口ですが、デスクトップ rail にだけ追加し、モバイル下部ナビゲーションは主要閲覧操作に集中させます。
