import { logs, SeverityNumber } from "@opentelemetry/api-logs"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs"
import type { CheckoutProviderVersion } from "./checkout-provider"

const SERVICE_NAME = "storzy"
const CHECKOUT_ROUTE = "/api/checkout"
const CHECKOUT_METHOD = "POST"

export type CheckoutOutcome = "success" | "invalid_request" | "payment_provider_timeout" | "internal_error"

export interface CheckoutLogInput {
  status: number
  durationMs: number
  outcome: CheckoutOutcome
  providerVersion: CheckoutProviderVersion
  requestId: string
}

let initialized = false
let loggerProvider: LoggerProvider | undefined

function optionalEnvironmentValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }

  return undefined
}

export function buildCheckoutLogAttributes(input: CheckoutLogInput) {
  const attributes: Record<string, string | number> = {
    service: SERVICE_NAME,
    environment: optionalEnvironmentValue("VERCEL_ENV", "NODE_ENV") ?? "unknown",
    route: CHECKOUT_ROUTE,
    method: CHECKOUT_METHOD,
    status: input.status,
    duration_ms: Math.max(0, Math.round(input.durationMs)),
    outcome: input.outcome,
    provider_version: input.providerVersion,
    request_id: input.requestId,
  }
  const releaseSha = optionalEnvironmentValue("VERCEL_GIT_COMMIT_SHA")

  if (releaseSha) {
    attributes.release_sha = releaseSha
  }

  return attributes
}

export function initializeCheckoutTelemetry() {
  if (initialized) return
  initialized = true

  const projectToken = process.env.POSTHOG_PROJECT_TOKEN?.trim()
  const logsEndpoint = process.env.POSTHOG_LOGS_ENDPOINT?.trim()
  if (!projectToken || !logsEndpoint) return

  try {
    const exporter = new OTLPLogExporter({
      url: logsEndpoint,
      headers: { Authorization: `Bearer ${projectToken}` },
    })
    const processor = new BatchLogRecordProcessor({ exporter })
    const provider = new LoggerProvider({
      resource: resourceFromAttributes({
        "service.name": SERVICE_NAME,
        "deployment.environment.name": optionalEnvironmentValue("VERCEL_ENV", "NODE_ENV") ?? "unknown",
      }),
      processors: [processor],
    })

    logs.setGlobalLoggerProvider(provider)
    loggerProvider = provider
  } catch {
    loggerProvider = undefined
  }
}

export function emitCheckoutLog(input: CheckoutLogInput) {
  if (!loggerProvider) return

  const severityNumber = input.status >= 500
    ? SeverityNumber.ERROR
    : input.status >= 400
      ? SeverityNumber.WARN
      : SeverityNumber.INFO

  try {
    logs.getLogger("storzy.checkout").emit({
      severityNumber,
      severityText: input.status >= 500 ? "ERROR" : input.status >= 400 ? "WARN" : "INFO",
      body: `checkout.${input.outcome}`,
      attributes: buildCheckoutLogAttributes(input),
    })
  } catch {
    // Telemetry must not change the checkout response.
  }
}

export async function flushCheckoutLogs() {
  try {
    await loggerProvider?.forceFlush()
  } catch {
    // Telemetry delivery must not change the checkout response.
  }
}
