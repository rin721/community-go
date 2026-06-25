export type AoiDanmakuMode = "scroll" | "top" | "bottom"

export interface AoiDanmakuMappedItem {
  id: string
  body: string
  timeSeconds: number
  mode?: AoiDanmakuMode
  color?: string
  authorName?: string
  createdAt?: string
}

export interface AoiDanmakuItem extends AoiDanmakuMappedItem {
  mode: AoiDanmakuMode
  color: string
}

export type AoiDanmakuMapper<T> = (item: T, index: number) => AoiDanmakuMappedItem

export interface AoiDanmakuSubmitPayload {
  body: string
  color: string
  mode: AoiDanmakuMode
  timeSeconds: number
}
