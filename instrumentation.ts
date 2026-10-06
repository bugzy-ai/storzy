export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeCheckoutTelemetry } = await import("@/lib/checkout-telemetry")
    initializeCheckoutTelemetry()
  }
}
