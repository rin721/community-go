export default defineNuxtPlugin(() => {
  const authSession = useAuthSessionStore()
  const library = useLibraryStore()

  onNuxtReady(async () => {
    library.restore()
    if (!authSession.hydrated) {
      await authSession.refreshSession({ silent: true })
    }
    void library.syncWithBackend()
    void library.syncHistoryWithBackend()
  })
})
