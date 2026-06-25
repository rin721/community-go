---
title: Project Overview
description: aoi-web is a frontend-first Nuxt 4 video community app connected to the backend Community API with local mock and browser-state fallbacks.
order: 10
category: project
navigation:
  icon: layout-dashboard
---

# Project Overview

`aoi-web` is a frontend-first Nuxt 4 application for a video community: creator pages, uploads, playback, danmaku, search, and settings. The current stage connects to the Go Community API in `backend/internal/modules/community`, while local mock APIs and browser state remain development and fallback boundaries.

## Stack

- Nuxt 4, Vue 3, TypeScript, and the Composition API.
- Pinia for client state.
- `@nuxtjs/i18n` with three locales, default `zh-CN`, and `no_prefix` routing.
- `@nuxt/icon` with local Lucide icons.
- Material Web exposed only through local Aoi wrappers.
- Nuxt Content for the `/docs` Markdown site.

## Product Boundary

Production data capabilities come from the public contract exposed by `backend/internal/modules/community`. `server/api/mock/` is only a frontend development mock; it must not replace backend production capabilities or hide permission, moderation, or persistence logic.

Long-term product, architecture, UI, API, and interaction constraints belong in the aggregate repository root `AGENTS.md`. Temporary research, prototypes, or phase plans should not become scattered rule files again.

## Main Flows

Home, search, categories, following, collections, history, playback, upload, and settings make up the current app surface. The docs site is public, but it is only added to the desktop rail; mobile bottom navigation stays focused on core browsing actions.
