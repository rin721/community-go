---
title: API とローカル状態
description: useAoiApi、telemetry、共有 DTO、Pinia、localStorage hydrate のルール。
order: 50
category: project
navigation:
  icon: database
---

# API とローカル状態

現在のアプリは mock API とブラウザローカル状態で動きます。それでも将来バックエンドの契約を保ち、一時的な表示用形状を API モデルのように広げないことが重要です。

## API アクセス

すべての API アクセスは `useAoiApi()` を通し、`useAoiApiTelemetry()` の診断と互換にします。新しい mock route は可能な限り `shared/` の DTO を再利用します。

## 共有 DTO

将来の Go バックエンドの request、response、entity 形状は共有型に置きます。ページは表示用に mapping できますが、バックエンド風のオブジェクトをその場で作らないようにします。

## ローカル状態

Pinia store はクライアントで安全に hydrate し、壊れた `localStorage` から復旧し、SSR crash を避ける必要があります。投稿 draft はファイルメタデータだけを保存し、ファイルバイトは保存しません。

## エラーと診断

エラーは console に消すだけでなく、ページや設定の診断に出せるようにします。ユーザー向けエラー文言は三つの locale ファイルに置きます。
