---
title: リポジトリ境界
description: app、shared、server/api/mock、i18n、design、生成ディレクトリの責務。
order: 20
category: project
navigation:
  icon: folder-tree
---

# リポジトリ境界

リポジトリはフロントエンドアプリ、共有契約、mock サービス、長期設計ルールで分かれています。新しいコードはもっとも近い責務の場所に置きます。

## アプリコード

`app/` は Nuxt フロントエンド本体です。ページ、コンポーネント、composable、store、plugin、style、ローカル型を含みます。業務ページでは Nuxt auto import とローカル composable を優先します。

`app/components/aoi/` は Material Web と Aoi デザインシステムの境界です。業務コンポーネントやページで `md-*` 要素を直接使わず、必要なら Aoi wrapper を追加または拡張します。

## 共有契約

`shared/` は app と mock server が共有する DTO、fixture、契約型を置きます。既存の共有契約がある場合、ページ内でレスポンス形状を作り直さないようにします。

## Mock API

`server/api/mock/` は現在のフロントエンドプロトタイプを支える場所です。mock レスポンスは将来 API に近づけますが、本番バックエンドにはしません。

## ローカライズと設計

`i18n/locales/` は `zh-CN`、`en`、`ja` のユーザー向け文言を管理します。共有文言を追加するときは三つすべてを更新します。

集約リポジトリ直下の `AGENTS.md` が長期ルールの場所です。`frontend/` の制約はフロントエンド開発時だけ適用します。短期メモや一度きりの計画を分散したルールファイルとして残しません。

## 生成ディレクトリ

`.nuxt/`、`.output/`、`node_modules/` などの生成物や依存ディレクトリは編集しません。依存変更は pnpm で意図的に行い、対応する lockfile 更新を残します。
