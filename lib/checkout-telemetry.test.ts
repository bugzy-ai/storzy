import { afterEach, describe, expect, it, vi } from "vitest"
import {
  buildCheckoutLogAttributes,
  emitCheckoutLog,
  flushCheckoutLogs,
} from "./checkout-telemetry"
import type { CheckoutLogInput } from "./checkout-telemetry"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("checkout telemetry", () => {
  it("creates a strict sanitized attribute allowlist", () => {
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc123")
    const attributes = buildCheckoutLogAttributes({
      status: 500,
      durationMs: 12.7,
      outcome: "internal_error",
      providerVersion: "v1",
      requestId: "generated-id",
      firstName: "Sensitive Name",
      username: "private-user",
      postalAddress: "Private Address",
      rawCart: [{ productName: "Secret Product" }],
      providerPayload: "raw provider data",
      token: "secret-token",
    } as CheckoutLogInput & Record<string, unknown>)

    expect(attributes).toEqual({
      service: "storzy",
      environment: "preview",
      route: "/api/checkout",
      method: "POST",
      status: 500,
      duration_ms: 13,
      outcome: "internal_error",
      provider_version: "v1",
      request_id: "generated-id",
      release_sha: "abc123",
    })
    expect(JSON.stringify(attributes)).not.toMatch(/Sensitive|password|token|cart|product name/i)
    expect(Object.keys(attributes)).toEqual([
      "service",
      "environment",
      "route",
      "method",
      "status",
      "duration_ms",
      "outcome",
      "provider_version",
      "request_id",
      "release_sha",
    ])
  })

  it("is a no-op when PostHog credentials are not configured", async () => {
    vi.stubEnv("POSTHOG_PROJECT_TOKEN", "")
    vi.stubEnv("POSTHOG_LOGS_ENDPOINT", "")
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(() => emitCheckoutLog({
      status: 200,
      durationMs: 4,
      outcome: "success",
      providerVersion: "v1",
      requestId: "test-id",
    })).not.toThrow()
    await expect(flushCheckoutLogs()).resolves.toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
