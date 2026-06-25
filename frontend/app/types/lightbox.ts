export type AoiLightboxItemType = "image" | "video"

export interface AoiLightboxItem {
  id: string
  type: AoiLightboxItemType
  src: string
  thumbnailSrc?: string
  posterSrc?: string
  alt?: string
  title?: string
  description?: string
  width?: number
  height?: number
  durationSeconds?: number
}

export interface AoiLightboxLabels {
  close?: string
  next?: string
  previous?: string
  first?: string
  last?: string
  play?: string
  pause?: string
  mute?: string
  unmute?: string
  volume?: string
  fullscreen?: string
  zoomIn?: string
  zoomOut?: string
  resetZoom?: string
  loading?: string
  imageError?: string
  videoError?: string
  empty?: string
  media?: string
}

export interface AoiLightboxVideoState {
  currentTime: number
  duration: number
  error: boolean
  fullscreen: boolean
  loading: boolean
  muted: boolean
  playing: boolean
  volume: number
}
