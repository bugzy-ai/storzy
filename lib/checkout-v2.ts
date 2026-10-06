import type { CheckoutItem } from "./checkout-v1"

const V2_CONFIGURATION = {
  authorizationTimeoutSeconds: 5,
  authorizationLatencyMs: 50,
}

export class PaymentProviderTimeoutError extends Error {
  readonly code = "PAYMENT_PROVIDER_TIMEOUT"

  constructor() {
    super("Payment provider request timed out")
    this.name = "PaymentProviderTimeoutError"
  }
}

function requestPaymentAuthorization(_items: CheckoutItem[], signal: AbortSignal) {
  return new Promise<{ ok: true }>((resolve, reject) => {
    const timer = setTimeout(() => resolve({ ok: true }), V2_CONFIGURATION.authorizationLatencyMs)
    const handleAbort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }

    signal.addEventListener("abort", handleAbort, { once: true })
  })
}

export async function processCheckoutV2(items: CheckoutItem[]) {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(new PaymentProviderTimeoutError()),
    V2_CONFIGURATION.authorizationTimeoutSeconds,
  )

  try {
    return await requestPaymentAuthorization(items, controller.signal)
  } finally {
    clearTimeout(timeout)
  }
}
