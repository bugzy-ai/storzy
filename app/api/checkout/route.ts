import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { processCheckoutV1, validateCheckoutRequest } from "@/lib/checkout-v1"
import { emitCheckoutLog, flushCheckoutLogs, type CheckoutOutcome } from "@/lib/checkout-telemetry"

export const runtime = "nodejs"

function jsonResponse(body: { ok: boolean; requestId: string; error?: string }, status: number, requestId: string) {
  return NextResponse.json(body, {
    status,
    headers: { "x-request-id": requestId },
  })
}

export async function POST(request: Request) {
  const startedAt = performance.now()
  const requestId = randomUUID()
  let status = 500
  let outcome: CheckoutOutcome = "internal_error"

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

    await processCheckoutV1(validation.items)
    status = 200
    outcome = "success"
    return jsonResponse({ ok: true, requestId }, status, requestId)
  } catch {
    status = 500
    outcome = "internal_error"
    return jsonResponse({ ok: false, requestId, error: "Checkout could not be completed. Please try again." }, status, requestId)
  } finally {
    emitCheckoutLog({ status, durationMs: performance.now() - startedAt, outcome, requestId })
    await flushCheckoutLogs()
  }
}
