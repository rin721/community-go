---
title: API and Local State
description: useAoiApi, telemetry, shared DTOs, Pinia, and localStorage hydration rules.
order: 50
category: project
navigation:
  icon: database
---

# API and Local State

The current app connects to the backend public Community API through `useAoiApi()`. Mock APIs and browser-local state are development, offline-experience, and fallback boundaries. Code should follow shared DTOs and backend route contracts instead of spreading temporary display shapes as API models.

## API Access

All API access goes through `useAoiApi()` and remains compatible with `useAoiApiTelemetry()` diagnostics. With `NUXT_PUBLIC_API_MOCK=false`, the app consumes the `result` envelope from `backend/internal/modules/community`; new mock routes should reuse DTOs from `shared/` whenever possible.

## Shared DTOs

Backend request, response, and entity shapes belong in shared types and should stay close to the contract exposed by `backend/internal/transport/http/contracts.go`. Pages can map data for display, but should not invent backend-like objects in place.

## Local State

Pinia stores must hydrate safely on the client, recover from damaged `localStorage`, and avoid SSR crashes. Upload draft state may persist file metadata, but never file bytes.

## Errors and Diagnostics

Errors should be exposed to pages and settings diagnostics rather than disappearing into console output. User-facing error copy belongs in all three locale files.
