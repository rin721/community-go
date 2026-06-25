export default defineNuxtPlugin(() => {
  const playerSettings = usePlayerSettingsStore()

  onNuxtReady(() => {
    playerSettings.restore()
  })
})
