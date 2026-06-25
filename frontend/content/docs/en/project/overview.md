---
title: Project Overview
description: aoi-web is a frontend-first Nuxt 4 video community app built around local mock APIs and browser state.
order: 10
category: project
navigation:
  icon: layout-dashboard
---

# Project Overview

`aoi-web` is a frontend-first Nuxt 4 application for a video community: creator pages, uploads, playback, danmaku, search, and settings. The current stage uses local mock APIs and browser state while preserving DTO contracts for a future Go backend.

## Stack

- Nuxt 4, Vue 3, TypeScript, and the Composition API.
- Pinia for client state.
- `@nuxtjs/i18n` with three locales, default `zh-CN`, and `no_prefix` routing.
- `@nuxt/icon` with local Lucide icons.
- Material Web exposed only through local Aoi wrappers.
- Nuxt Content for the `/docs` Markdown site.

## Product Boundary

The app does not implement a production backend today. `server/api/mock/` exists to make frontend flows behave close to future API contracts, not to grow server-side product behavior.

Long-term product, architecture, UI, API, and interaction constraints belong in the aggregate repository root `AGENTS.md`. Temporary research, prototypes, or phase plans should not become scattered rule files again.

## Main Flows

Home, search, categories, following, collections, history, playback, upload, and settings make up the current app surface. The docs site is public, but it is only added to the desktop rail; mobile bottom navigation stays focused on core browsing actions.
