export default defineNuxtPlugin(() => {
  const library = useLibraryStore()

  onNuxtReady(() => {
    library.restore()
  })
})
