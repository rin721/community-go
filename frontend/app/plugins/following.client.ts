export default defineNuxtPlugin(() => {
  const following = useFollowingStore()

  onNuxtReady(() => {
    following.restore()
  })
})
