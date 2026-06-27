import type { ApiStatus } from "../../../shared/types/api"

const endpoints = [
  "/auth/login",
  "/auth/logout",
  "/auth/session",
  "/auth/signup",
  "/account/dynamics",
  "/account/notifications",
  "/account/notifications/read",
  "/account/submissions",
  "/home",
  "/categories",
  "/videos",
  "/videos/:id",
  "/videos/:id/interaction-state",
  "/videos/:id/interactions/:kind",
  "/videos/:id/history",
  "/videos/:id/comments",
  "/videos/:id/danmaku",
  "/search",
  "/feed/following",
  "/library",
  "/history",
  "/history/clear",
  "/submissions",
  "/users/:handle",
  "/users/:handle/follow-state",
  "/users/:handle/follow",
  "/status"
]

export default defineEventHandler((): ApiStatus => ({
  basePath: "/api/mock",
  endpoints,
  generatedAt: new Date().toISOString(),
  latencyMs: 0,
  mode: "mock"
}))
