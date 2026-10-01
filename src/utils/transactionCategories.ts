export interface TransactionCategoryLike {
  category?: string
  categories?: string[]
}

/**
 * Returns all categories assigned to a transaction.
 * If `categories` array is non-empty, returns it.
 * Otherwise, falls back to `[category]` (or empty array if none).
 */
export function getTransactionCategories(item: TransactionCategoryLike): string[] {
  if (Array.isArray(item.categories) && item.categories.length > 0) {
    return Array.from(new Set(item.categories.filter((cat): cat is string => typeof cat === 'string' && cat.trim().length > 0)))
  }
  if (typeof item.category === 'string' && item.category.trim().length > 0) {
    return [item.category]
  }
  return []
}

/**
 * Returns secondary (additional) categories, excluding the primary category.
 */
export function getTransactionSubCategories(item: TransactionCategoryLike): string[] {
  const primary = item.category
  const all = getTransactionCategories(item)
  return all.filter((cat) => cat !== primary)
}

/**
 * Resolves the primary category and full categories list when saving a transaction.
 */
export function resolveTransactionCategories(primaryCategory?: string, subCategories?: string[]): {
  category?: string
  categories?: string[]
} {
  if (!primaryCategory) {
    return { category: undefined, categories: undefined }
  }
  const cleanSubs = Array.isArray(subCategories)
    ? subCategories.filter((cat): cat is string => typeof cat === 'string' && cat.trim().length > 0 && cat !== primaryCategory)
    : []
  const allCategories = Array.from(new Set([primaryCategory, ...cleanSubs]))
  return {
    category: primaryCategory,
    categories: allCategories,
  }
}

/**
 * Checks if a transaction matches a selected category filter.
 * Returns true if selectedCategory is 'همه' or if the transaction's primary or any secondary category matches.
 */
export function matchesTransactionCategory(
  item: TransactionCategoryLike,
  selectedCategory: string,
  getCategoryLabel: (key: string) => string,
): boolean {
  if (selectedCategory === 'همه') return true
  const categories = getTransactionCategories(item)
  const labels = categories.map(getCategoryLabel)
  return labels.includes(selectedCategory)
}

/**
 * Removes a category from a categories array.
 */
export function removeTransactionCategory(
  categories: string[],
  categoryToRemove: string,
): string[] {
  return categories.filter((cat) => cat !== categoryToRemove)
}

