export default defineNuxtPlugin(() => {
  const authSession = useAuthSessionStore()

  onNuxtReady(() => {
    void authSession.refreshSession({ silent: true })
  })
})
