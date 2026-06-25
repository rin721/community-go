import type { ApiStatus } from "../../../shared/types/api"

const endpoints = [
  "/home",
  "/categories",
  "/videos",
  "/videos/:id",
  "/videos/:id/comments",
  "/videos/:id/danmaku",
  "/search",
  "/feed/following",
  "/users/:handle",
  "/status"
]

export default defineEventHandler((): ApiStatus => ({
  basePath: "/api/mock",
  endpoints,
  generatedAt: new Date().toISOString(),
  latencyMs: 0,
  mode: "mock"
}))
