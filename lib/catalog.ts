import type { Product } from "./products"

function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) return false
  const product = value as Partial<Product>

  return (
    typeof product.id === "number" && Number.isSafeInteger(product.id) && product.id > 0 &&
    typeof product.name === "string" &&
    typeof product.description === "string" &&
    typeof product.price === "number" && Number.isFinite(product.price) && product.price >= 0 &&
    typeof product.image === "string"
  )
}

export function parseCatalogResponse(value: unknown): Product[] | null {
  if (typeof value !== "object" || value === null) return null
  const response = value as { ok?: unknown; products?: unknown }
  if (response.ok !== true || !Array.isArray(response.products) || !response.products.every(isProduct)) {
    return null
  }

  return response.products
}
