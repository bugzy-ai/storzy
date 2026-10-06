import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const state = {
    exporterOptions: undefined as unknown,
    processorOptions: undefined as unknown,
    providerOptions: undefined as unknown,
    emittedRecord: undefined as unknown,
    forceFlush: vi.fn(async () => {}),
  }
  const emit = vi.fn((record: unknown) => { state.emittedRecord = record })
  const getLogger = vi.fn((_name: string) => ({ emit }))

  class MockExporter {
    constructor(options: unknown) {
      state.exporterOptions = options
    }
  }

  class MockProcessor {
    constructor(options: unknown) {
      state.processorOptions = options
    }
  }

  class MockLoggerProvider {
    constructor(options: unknown) {
      state.providerOptions = options
    }

    forceFlush() {
      return state.forceFlush()
    }

    getLogger(name: string) {
      return getLogger(name)
    }
  }

  return {
    state,
    MockExporter,
    MockProcessor,
    MockLoggerProvider,
    getLogger,
    emit,
  }
})

vi.mock("@opentelemetry/api-logs", () => ({
  SeverityNumber: { INFO: 9, WARN: 13, ERROR: 17 },
}))
vi.mock("@opentelemetry/exporter-logs-otlp-http", () => ({ OTLPLogExporter: mocks.MockExporter }))
vi.mock("@opentelemetry/sdk-logs", () => ({
  BatchLogRecordProcessor: mocks.MockProcessor,
  LoggerProvider: mocks.MockLoggerProvider,
}))
vi.mock("@opentelemetry/resources", () => ({
  resourceFromAttributes: vi.fn((attributes: unknown) => attributes),
}))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe("configured PostHog Logs delivery", () => {
  it("lazily initializes its local provider, emits sanitized records, and flushes", async () => {
    vi.stubEnv("POSTHOG_PROJECT_TOKEN", "test-project-token")
    vi.stubEnv("POSTHOG_LOGS_ENDPOINT", "https://eu.i.posthog.com/i/v1/logs")
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "release-sha")

    const telemetry = await import("./checkout-telemetry")
    telemetry.emitCheckoutLog({
      status: 200,
      durationMs: 17,
      outcome: "success",
      providerVersion: "v1",
      requestId: "generated-correlation-id",
    })
    await telemetry.flushCheckoutLogs()

    expect(mocks.state.exporterOptions).toEqual({
      url: "https://eu.i.posthog.com/i/v1/logs",
      headers: { Authorization: "Bearer test-project-token" },
    })
    expect(mocks.state.processorOptions).toEqual({ exporter: expect.any(mocks.MockExporter) })
    expect(mocks.state.providerOptions).toMatchObject({
      resource: {
        "service.name": "storzy",
        "deployment.environment.name": "preview",
      },
      processors: [expect.any(mocks.MockProcessor)],
    })
    expect(mocks.getLogger).toHaveBeenCalledWith("storzy.checkout")
    expect(mocks.state.emittedRecord).toEqual({
      severityNumber: 9,
      severityText: "INFO",
      body: "checkout.success",
      attributes: {
        service: "storzy",
        environment: "preview",
        route: "/api/checkout",
        method: "POST",
        status: 200,
        duration_ms: 17,
        outcome: "success",
        provider_version: "v1",
        request_id: "generated-correlation-id",
        release_sha: "release-sha",
      },
    })
    expect(mocks.state.forceFlush).toHaveBeenCalledOnce()

    mocks.emit.mockImplementationOnce(() => { throw new Error("telemetry exporter failure") })
    expect(() => telemetry.emitCheckoutLog({
      status: 500,
      durationMs: 2,
      outcome: "internal_error",
      providerVersion: "v1",
      requestId: "generated-correlation-id",
    })).not.toThrow()

    mocks.state.forceFlush.mockRejectedValueOnce(new Error("flush failure"))
    await expect(telemetry.flushCheckoutLogs()).resolves.toBeUndefined()
  })
})
