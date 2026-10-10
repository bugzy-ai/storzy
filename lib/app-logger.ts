import { SeverityNumber } from "@opentelemetry/api-logs"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs"
import type { CheckoutProviderVersion } from "./checkout-provider"

const SERVICE_NAME = "storzy"

export type OperationalErrorType =
  | "INTERNAL_ERROR"
  | "PAYMENT_PROVIDER_TIMEOUT"
  | "PAYMENT_PROVIDER_ERROR"

interface CommonLogInput {
  route: "/api/login" | "/api/products" | "/api/checkout"
  method: "GET" | "POST"
  status: number
  durationMs: number
  requestId: string
}

export type OperationalLogInput =
  | (CommonLogInput & {
      eventName: "authentication.completed"
      outcome: "success" | "invalid_request" | "invalid_credentials" | "internal_error"
      errorType?: "INTERNAL_ERROR"
    })
  | (CommonLogInput & {
      eventName: "catalog.retrieval.completed"
      outcome: "success" | "invalid_request" | "internal_error"
      itemCount?: number
      errorType?: "INTERNAL_ERROR"
    })
  | (CommonLogInput & {
      eventName: "checkout.request.completed"
      outcome: "success" | "invalid_request" | "payment_provider_timeout" | "internal_error"
      providerVersion: CheckoutProviderVersion
      errorType?: OperationalErrorType
    })
  | (CommonLogInput & {
      eventName: "payment.authorization.completed"
      outcome: "success" | "timeout" | "provider_error"
      providerVersion: CheckoutProviderVersion
      errorType?: "PAYMENT_PROVIDER_TIMEOUT" | "PAYMENT_PROVIDER_ERROR"
    })

let initialized = false
let loggerProvider: LoggerProvider | undefined

function optionalEnvironmentValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }

  return undefined
}

export function buildOperationalLogAttributes(input: OperationalLogInput) {
  const attributes: Record<string, string | number> = {
    service: SERVICE_NAME,
    event_name: input.eventName,
    environment: optionalEnvironmentValue("VERCEL_ENV", "NODE_ENV") ?? "unknown",
    route: input.route,
    method: input.method,
    status: input.status,
    duration_ms: Math.max(0, Math.round(input.durationMs)),
    outcome: input.outcome,
    request_id: input.requestId,
  }

  const releaseSha = optionalEnvironmentValue("VERCEL_GIT_COMMIT_SHA")
  if (releaseSha) attributes.release_sha = releaseSha
  if ("providerVersion" in input) attributes.provider_version = input.providerVersion
  if (input.errorType) attributes.error_type = input.errorType
  if ("itemCount" in input && input.itemCount !== undefined) {
    attributes.item_count = Math.max(0, Math.trunc(input.itemCount))
  }

  return attributes
}

function initializeOperationalLogger() {
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
    loggerProvider = new LoggerProvider({
      resource: resourceFromAttributes({
        "service.name": SERVICE_NAME,
        "deployment.environment.name": optionalEnvironmentValue("VERCEL_ENV", "NODE_ENV") ?? "unknown",
      }),
      processors: [processor],
    })
  } catch {
    loggerProvider = undefined
  }
}

export function emitOperationalLog(input: OperationalLogInput) {
  initializeOperationalLogger()
  if (!loggerProvider) return

  const severityNumber = input.status >= 500
    ? SeverityNumber.ERROR
    : input.status >= 400
      ? SeverityNumber.WARN
      : SeverityNumber.INFO

  try {
    loggerProvider.getLogger("storzy.server").emit({
      severityNumber,
      severityText: input.status >= 500 ? "ERROR" : input.status >= 400 ? "WARN" : "INFO",
      body: input.eventName,
      attributes: buildOperationalLogAttributes(input),
    })
  } catch {
    // Operational logging must not change application behavior.
  }
}

export async function flushOperationalLogs() {
  try {
    await loggerProvider?.forceFlush()
  } catch {
    // Operational logging must not change application behavior.
  }
}
