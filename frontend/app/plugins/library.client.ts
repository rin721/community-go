export default defineNuxtPlugin(() => {
  const library = useLibraryStore()

  onNuxtReady(() => {
    library.restore()
    void library.syncWithBackend()
    void library.syncHistoryWithBackend()
  })
})
