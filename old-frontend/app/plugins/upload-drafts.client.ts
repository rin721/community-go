export default defineNuxtPlugin(() => {
  const uploadDrafts = useUploadDraftStore()

  onNuxtReady(() => {
    uploadDrafts.restore()
  })
})
