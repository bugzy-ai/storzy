import { afterEach, describe, expect, it, vi } from "vitest"
import {
  buildOperationalLogAttributes,
  emitOperationalLog,
  flushOperationalLogs,
} from "./app-logger"
import type { OperationalLogInput } from "./app-logger"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("operational logging", () => {
  it("creates a strict sanitized attribute allowlist", () => {
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc123")
    const attributes = buildOperationalLogAttributes({
      eventName: "checkout.request.completed",
      route: "/api/checkout",
      method: "POST",
      status: 200,
      durationMs: 12.7,
      outcome: "success",
      providerVersion: "v1",
      requestId: "generated-id",
      firstName: "Sensitive Name",
      username: "private-user",
      postalAddress: "Private Address",
      rawCart: [{ productName: "Secret Product" }],
      providerPayload: "raw provider data",
      token: "secret-token",
    } as OperationalLogInput & Record<string, unknown>)

    expect(attributes).toEqual({
      service: "storzy",
      environment: "preview",
      route: "/api/checkout",
      method: "POST",
      event_name: "checkout.request.completed",
      status: 200,
      duration_ms: 13,
      outcome: "success",
      provider_version: "v1",
      request_id: "generated-id",
      release_sha: "abc123",
    })
    expect(JSON.stringify(attributes)).not.toMatch(/Sensitive|password|token|cart|product name/i)
    expect(Object.keys(attributes)).toEqual([
      "service",
      "event_name",
      "environment",
      "route",
      "method",
      "status",
      "duration_ms",
      "outcome",
      "request_id",
      "release_sha",
      "provider_version",
    ])
  })

  it("is a no-op when PostHog credentials are not configured", async () => {
    vi.stubEnv("POSTHOG_PROJECT_TOKEN", "")
    vi.stubEnv("POSTHOG_LOGS_ENDPOINT", "")
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(() => emitOperationalLog({
      eventName: "authentication.completed",
      route: "/api/login",
      method: "POST",
      status: 200,
      durationMs: 4,
      outcome: "success",
      requestId: "test-id",
    })).not.toThrow()
    await expect(flushOperationalLogs()).resolves.toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
