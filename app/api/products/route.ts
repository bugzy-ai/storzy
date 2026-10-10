import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { emitOperationalLog, flushOperationalLogs } from "@/lib/app-logger"
import { PRODUCTS } from "@/lib/products"

export const runtime = "nodejs"

type CatalogOutcome = "success" | "invalid_request" | "internal_error"

function jsonResponse(body: object, status: number, requestId: string) {
  return NextResponse.json(body, {
    status,
    headers: { "x-request-id": requestId },
  })
}

export async function GET(request: Request) {
  const startedAt = performance.now()
  const requestId = randomUUID()
  let status = 500
  let outcome: CatalogOutcome = "internal_error"
  let itemCount: number | undefined

  try {
    if (new URL(request.url).search) {
      status = 400
      outcome = "invalid_request"
      return jsonResponse({ ok: false, requestId, error: "Invalid catalog request." }, status, requestId)
    }

    status = 200
    outcome = "success"
    itemCount = PRODUCTS.length
    return jsonResponse({ ok: true, products: PRODUCTS, requestId }, status, requestId)
  } catch {
    status = 500
    outcome = "internal_error"
    return jsonResponse({ ok: false, requestId, error: "Products could not be loaded. Please try again." }, status, requestId)
  } finally {
    emitOperationalLog({
      eventName: "catalog.retrieval.completed",
      route: "/api/products",
      method: "GET",
      status,
      durationMs: performance.now() - startedAt,
      outcome,
      ...(itemCount === undefined ? {} : { itemCount }),
      ...(outcome === "internal_error" ? { errorType: "INTERNAL_ERROR" as const } : {}),
      requestId,
    })
    await flushOperationalLogs()
  }
}
