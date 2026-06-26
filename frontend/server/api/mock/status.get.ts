import type { ApiStatus } from "../../../shared/types/api"

const endpoints = [
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
