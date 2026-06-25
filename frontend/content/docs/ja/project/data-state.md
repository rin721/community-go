---
title: API とローカル状態
description: useAoiApi、telemetry、共有 DTO、Pinia、localStorage hydrate のルール。
order: 50
category: project
navigation:
  icon: database
---

# API とローカル状態

現在のアプリは `useAoiApi()` を通してバックエンドの公開 Community API に接続します。mock API とブラウザローカル状態は開発、オフライン体験、fallback の境界です。一時的な表示用形状を API モデルのように広げず、共有 DTO とバックエンド route contract を正にします。

## API アクセス

すべての API アクセスは `useAoiApi()` を通し、`useAoiApiTelemetry()` の診断と互換にします。`NUXT_PUBLIC_API_MOCK=false` では `backend/internal/modules/community` が返す `result` envelope を消費します。新しい mock route は可能な限り `shared/` の DTO を再利用します。

## 共有 DTO

バックエンドの request、response、entity 形状は共有型に置き、`backend/internal/transport/http/contracts.go` が公開する契約に近づけます。ページは表示用に mapping できますが、バックエンド風のオブジェクトをその場で作らないようにします。

## ローカル状態

Pinia store はクライアントで安全に hydrate し、壊れた `localStorage` から復旧し、SSR crash を避ける必要があります。投稿 draft はファイルメタデータだけを保存し、ファイルバイトは保存しません。

## エラーと診断

エラーは console に消すだけでなく、ページや設定の診断に出せるようにします。ユーザー向けエラー文言は三つの locale ファイルに置きます。
