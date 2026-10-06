import type { CheckoutItem } from "./checkout-v1"

interface CheckoutResponse {
  ok: boolean
  json(): Promise<unknown>
}

export interface CheckoutEffects {
  submit: (items: CheckoutItem[]) => Promise<CheckoutResponse>
  clearCart: () => void
  navigateToCompletion: () => void
}

export async function completeCheckout(items: CheckoutItem[], effects: CheckoutEffects) {
  try {
    const response = await effects.submit(items)
    if (!response.ok) return false

    const body = await response.json()
    if (typeof body !== "object" || body === null || (body as { ok?: unknown }).ok !== true) return false

    effects.clearCart()
    effects.navigateToCompletion()
    return true
  } catch {
    return false
  }
}
