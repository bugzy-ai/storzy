import { processCheckoutV1, type CheckoutItem } from "./checkout-v1"
import { processCheckoutV2 } from "./checkout-v2"

export type CheckoutProviderVersion = "v1" | "v2"

export interface CheckoutProvider {
  version: CheckoutProviderVersion
  process: (items: CheckoutItem[]) => Promise<{ ok: true }>
}

const providerV1: CheckoutProvider = {
  version: "v1",
  process: processCheckoutV1,
}

const providerV2: CheckoutProvider = {
  version: "v2",
  process: processCheckoutV2,
}

export function selectCheckoutProvider(flagValue: string | undefined) {
  return flagValue === "true" ? providerV2 : providerV1
}

export function getCheckoutProvider() {
  return selectCheckoutProvider(process.env.CHECKOUT_PROVIDER_V2)
}
