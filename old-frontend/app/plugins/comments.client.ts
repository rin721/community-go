export default defineNuxtPlugin(() => {
  const comments = useCommentsStore()

  onNuxtReady(() => {
    comments.restore()
  })
})
