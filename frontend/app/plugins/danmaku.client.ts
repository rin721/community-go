export default defineNuxtPlugin(() => {
  const danmaku = useDanmakuStore()

  onNuxtReady(() => {
    danmaku.restore()
  })
})
