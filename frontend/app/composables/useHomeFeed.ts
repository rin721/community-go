import { getCategorySelfAndDescendants } from "~~/shared/utils/categories"
import { isAoiSetupRequiredError } from "./useAoiApi"

export function useHomeFeed() {
  const api = useAoiApi()
  const settings = useAppSettingsStore()
  const setupRequired = useState("home-feed-setup-required", () => false)

  const selectedCategory = computed({
    get: () => settings.selectedCategory,
    set: (value: string) => settings.setSelectedCategory(value)
  })

  const { data, error, pending, refresh } = useAsyncData("home-feed", async () => {
    try {
      const payload = await api.getHomePayload()

      setupRequired.value = false

      return payload
    } catch (error) {
      setupRequired.value = isAoiSetupRequiredError(error)

      throw error
    }
  }, {
    default: () => ({
      categories: [],
      announcement: null,
      dynamics: {
        items: [],
        nextCursor: null
      },
      latest: {
        items: [],
        nextCursor: null
      }
    })
  })

  const categories = computed(() => data.value.categories)
  const announcement = computed(() => data.value.announcement)
  const dynamics = computed(() => data.value.dynamics.items)
  const videos = computed(() => {
    if (selectedCategory.value === "home") {
      return data.value.latest.items
    }

    const selectedSlugs = getCategorySelfAndDescendants(data.value.categories, selectedCategory.value).map((category) => category.slug)

    return data.value.latest.items.filter((video) =>
      video.categories.some((category) => selectedSlugs.includes(category.slug))
    )
  })

  function selectCategory(slug: string) {
    selectedCategory.value = slug
  }

  return {
    announcement,
    categories,
    dynamics,
    error,
    pending,
    refresh,
    selectCategory,
    selectedCategory,
    setupRequired,
    videos
  }
}
