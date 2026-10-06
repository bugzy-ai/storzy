import { PRODUCTS } from "./products"

export interface CheckoutItem {
  productId: number
  quantity: number
}

export type CheckoutValidation =
  | { ok: true; items: CheckoutItem[] }
  | { ok: false }

export function validateCheckoutRequest(value: unknown): CheckoutValidation {
  if (typeof value !== "object" || value === null || !Array.isArray((value as { items?: unknown }).items)) {
    return { ok: false }
  }

  const items = (value as { items: unknown[] }).items
  if (items.length === 0 || items.length > 100) return { ok: false }

  const productIds = new Set(PRODUCTS.map(({ id }) => id))
  const validItems: CheckoutItem[] = []
  for (const item of items) {
    if (typeof item !== "object" || item === null) return { ok: false }
    const { productId, quantity } = item as { productId?: unknown; quantity?: unknown }
    if (
      typeof productId !== "number" || !Number.isSafeInteger(productId) || !productIds.has(productId) ||
      typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity <= 0
    ) {
      return { ok: false }
    }

    validItems.push({ productId, quantity })
  }

  return { ok: true, items: validItems }
}

export async function processCheckoutV1(_items: CheckoutItem[]) {
  return { ok: true as const }
}
