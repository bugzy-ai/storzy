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

    const telemetry = await import("./app-logger")
    telemetry.emitOperationalLog({
      eventName: "authentication.completed",
      route: "/api/login",
      method: "POST",
      status: 200,
      durationMs: 17,
      outcome: "success",
      requestId: "generated-correlation-id",
    })
    await telemetry.flushOperationalLogs()

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
    expect(mocks.getLogger).toHaveBeenCalledWith("storzy.server")
    expect(mocks.state.emittedRecord).toEqual({
      severityNumber: 9,
      severityText: "INFO",
      body: "authentication.completed",
      attributes: {
        service: "storzy",
        event_name: "authentication.completed",
        environment: "preview",
        route: "/api/login",
        method: "POST",
        status: 200,
        duration_ms: 17,
        outcome: "success",
        request_id: "generated-correlation-id",
        release_sha: "release-sha",
      },
    })
    expect(mocks.state.forceFlush).toHaveBeenCalledOnce()

    telemetry.emitOperationalLog({
      eventName: "authentication.completed",
      route: "/api/login",
      method: "POST",
      status: 401,
      durationMs: 3,
      outcome: "invalid_credentials",
      requestId: "rejected-request",
    })
    expect(mocks.state.emittedRecord).toEqual(expect.objectContaining({
      severityNumber: 13,
      severityText: "WARN",
    }))

    telemetry.emitOperationalLog({
      eventName: "authentication.completed",
      route: "/api/login",
      method: "POST",
      status: 500,
      durationMs: 3,
      outcome: "internal_error",
      errorType: "INTERNAL_ERROR",
      requestId: "failed-request",
    })
    expect(mocks.state.emittedRecord).toEqual(expect.objectContaining({
      severityNumber: 17,
      severityText: "ERROR",
    }))

    mocks.emit.mockImplementationOnce(() => { throw new Error("telemetry exporter failure") })
    expect(() => telemetry.emitOperationalLog({
      eventName: "authentication.completed",
      route: "/api/login",
      method: "POST",
      status: 500,
      durationMs: 2,
      outcome: "internal_error",
      errorType: "INTERNAL_ERROR",
      requestId: "generated-correlation-id",
    })).not.toThrow()

    mocks.state.forceFlush.mockRejectedValueOnce(new Error("flush failure"))
    await expect(telemetry.flushOperationalLogs()).resolves.toBeUndefined()
  })
})
