export const AOI_ALL_CATEGORY = "__aoi_all_categories__"

const LEGACY_ALL_CATEGORY = "home"

export function normalizeCommunityCategorySelection(value: string | null | undefined) {
  const slug = value?.trim() || ""

  return slug && slug !== LEGACY_ALL_CATEGORY ? slug : AOI_ALL_CATEGORY
}

export function isCommunityAllCategory(value: string | null | undefined) {
  return normalizeCommunityCategorySelection(value) === AOI_ALL_CATEGORY
}
