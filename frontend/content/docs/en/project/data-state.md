---
title: API and Local State
description: useAoiApi, telemetry, shared DTOs, Pinia, and localStorage hydration rules.
order: 50
category: project
navigation:
  icon: database
---

# API and Local State

The current app is driven by mock APIs and browser-local state. Code should still preserve future backend contracts and avoid spreading temporary display shapes as if they were API models.

## API Access

All API access goes through `useAoiApi()` and remains compatible with `useAoiApiTelemetry()` diagnostics. New mock routes should reuse DTOs from `shared/` whenever possible.

## Shared DTOs

Future Go backend request, response, and entity shapes belong in shared types. Pages can map data for display, but should not invent backend-like objects in place.

## Local State

Pinia stores must hydrate safely on the client, recover from damaged `localStorage`, and avoid SSR crashes. Upload draft state may persist file metadata, but never file bytes.

## Errors and Diagnostics

Errors should be exposed to pages and settings diagnostics rather than disappearing into console output. User-facing error copy belongs in all three locale files.
