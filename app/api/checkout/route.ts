import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import {
  emitOperationalLog,
  flushOperationalLogs,
  type OperationalErrorType,
} from "@/lib/app-logger"
import { getCheckoutProvider } from "@/lib/checkout-provider"
import { validateCheckoutRequest } from "@/lib/checkout-v1"
import { PaymentProviderTimeoutError } from "@/lib/checkout-v2"

export const runtime = "nodejs"

type CheckoutOutcome = "success" | "invalid_request" | "payment_provider_timeout" | "internal_error"

function jsonResponse(
  body: { ok: boolean; requestId: string; error?: string; code?: "PAYMENT_PROVIDER_TIMEOUT" },
  status: number,
  requestId: string,
) {
  return NextResponse.json(body, {
    status,
    headers: { "x-request-id": requestId },
  })
}

export async function POST(request: Request) {
  const startedAt = performance.now()
  const requestId = randomUUID()
  const provider = getCheckoutProvider()
  let status = 500
  let outcome: CheckoutOutcome = "internal_error"
  let errorType: OperationalErrorType | undefined

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      status = 400
      outcome = "invalid_request"
      return jsonResponse({ ok: false, requestId, error: "Invalid checkout request." }, status, requestId)
    }

    const validation = validateCheckoutRequest(body)
    if (!validation.ok) {
      status = 400
      outcome = "invalid_request"
      return jsonResponse({ ok: false, requestId, error: "Invalid checkout request." }, status, requestId)
    }

    const paymentStartedAt = performance.now()
    try {
      await provider.process(validation.items)
      emitOperationalLog({
        eventName: "payment.authorization.completed",
        route: "/api/checkout",
        method: "POST",
        status: 200,
        durationMs: performance.now() - paymentStartedAt,
        outcome: "success",
        providerVersion: provider.version,
        requestId,
      })
    } catch (error) {
      const isTimeout = error instanceof PaymentProviderTimeoutError
      errorType = isTimeout ? "PAYMENT_PROVIDER_TIMEOUT" : "PAYMENT_PROVIDER_ERROR"
      emitOperationalLog({
        eventName: "payment.authorization.completed",
        route: "/api/checkout",
        method: "POST",
        status: isTimeout ? 504 : 500,
        durationMs: performance.now() - paymentStartedAt,
        outcome: isTimeout ? "timeout" : "provider_error",
        providerVersion: provider.version,
        errorType,
        requestId,
      })
      throw error
    }

    status = 200
    outcome = "success"
    return jsonResponse({ ok: true, requestId }, status, requestId)
  } catch (error) {
    if (error instanceof PaymentProviderTimeoutError) {
      status = 504
      outcome = "payment_provider_timeout"
      return jsonResponse({
        ok: false,
        requestId,
        error: "Checkout could not be completed. Please try again.",
        code: "PAYMENT_PROVIDER_TIMEOUT",
      }, status, requestId)
    }

    status = 500
    outcome = "internal_error"
    return jsonResponse({ ok: false, requestId, error: "Checkout could not be completed. Please try again." }, status, requestId)
  } finally {
    emitOperationalLog({
      eventName: "checkout.request.completed",
      route: "/api/checkout",
      method: "POST",
      status,
      durationMs: performance.now() - startedAt,
      outcome,
      providerVersion: provider.version,
      ...(errorType ? { errorType } : {}),
      requestId,
    })
    await flushOperationalLogs()
  }
}
