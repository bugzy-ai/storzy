import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { emitOperationalLog, flushOperationalLogs } from "@/lib/app-logger"
import { authenticate, validateLoginRequest } from "@/lib/auth"

export const runtime = "nodejs"

type AuthenticationOutcome = "success" | "invalid_request" | "invalid_credentials" | "internal_error"

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
  let outcome: AuthenticationOutcome = "internal_error"

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      status = 400
      outcome = "invalid_request"
      return jsonResponse({ ok: false, requestId, error: "Invalid login request." }, status, requestId)
    }

    const validation = validateLoginRequest(body)
    if (!validation.ok) {
      status = 400
      outcome = "invalid_request"
      return jsonResponse({ ok: false, requestId, error: "Invalid login request." }, status, requestId)
    }

    if (!authenticate(validation.credentials)) {
      status = 401
      outcome = "invalid_credentials"
      return jsonResponse({ ok: false, requestId, error: "Invalid username or password." }, status, requestId)
    }

    status = 200
    outcome = "success"
    return jsonResponse({ ok: true, requestId }, status, requestId)
  } catch {
    status = 500
    outcome = "internal_error"
    return jsonResponse({ ok: false, requestId, error: "Login could not be completed. Please try again." }, status, requestId)
  } finally {
    emitOperationalLog({
      eventName: "authentication.completed",
      route: "/api/login",
      method: "POST",
      status,
      durationMs: performance.now() - startedAt,
      outcome,
      ...(outcome === "internal_error" ? { errorType: "INTERNAL_ERROR" as const } : {}),
      requestId,
    })
    await flushOperationalLogs()
  }
}
