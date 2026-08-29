import type { VideoSummary } from "~/types/api"

export type LibraryVideoSnapshot = VideoSummary

export interface HistoryEntry {
  lastViewedAt: string
  progressSeconds: number
  video: LibraryVideoSnapshot
}
