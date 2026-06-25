import type { Category, CategoryTreeNode } from "../types/api"

export interface CategoryFlatItem extends Category {
  children: CategoryTreeNode[]
  depth: number
  path: Category[]
}

export function flattenCategoryTree(
  categories: CategoryTreeNode[],
  depth = 0,
  ancestors: Category[] = []
): CategoryFlatItem[] {
  return categories.flatMap((category) => {
    const path = [...ancestors, category]
    const item: CategoryFlatItem = {
      ...category,
      children: category.children || [],
      depth,
      path
    }

    return [
      item,
      ...flattenCategoryTree(category.children || [], depth + 1, path)
    ]
  })
}

export function findCategoryInTree(categories: CategoryTreeNode[], slug: string) {
  return flattenCategoryTree(categories).find((category) => category.slug === slug) || null
}

export function getCategoryDescendants(categories: CategoryTreeNode[], slug: string) {
  const category = findCategoryInTree(categories, slug)

  return category ? flattenCategoryTree(category.children) : []
}

export function getCategorySelfAndDescendants(categories: CategoryTreeNode[], slug: string) {
  const category = findCategoryInTree(categories, slug)

  return category ? [category, ...flattenCategoryTree(category.children)] : []
}

export function getCategoryLeafNodes(categories: CategoryTreeNode[]) {
  return flattenCategoryTree(categories).filter((category) => category.children.length === 0)
}

export function isCategoryLeaf(category: Pick<CategoryTreeNode, "children">) {
  return category.children.length === 0
}

export function formatCategoryPath(category: Pick<CategoryFlatItem, "name" | "path">) {
  return category.path.map((item) => item.name).join(" / ")
}
