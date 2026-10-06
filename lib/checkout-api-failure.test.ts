import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  processCheckoutV1: vi.fn(),
  emitCheckoutLog: vi.fn(),
  flushCheckoutLogs: vi.fn(async () => {}),
}))

vi.mock("@/lib/checkout-v1", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./checkout-v1")>()
  return { ...actual, processCheckoutV1: mocks.processCheckoutV1 }
})
vi.mock("@/lib/checkout-telemetry", () => ({
  emitCheckoutLog: mocks.emitCheckoutLog,
  flushCheckoutLogs: mocks.flushCheckoutLogs,
}))

import { POST } from "@/app/api/checkout/route"

afterEach(() => vi.clearAllMocks())

describe("checkout API unexpected failures", () => {
  it("returns a safe error and awaits telemetry flush", async () => {
    mocks.processCheckoutV1.mockRejectedValueOnce(new Error("raw provider payload and secret"))
    let finishFlush!: () => void
    mocks.flushCheckoutLogs.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishFlush = resolve
    }))

    let responseResolved = false
    const responsePromise = POST(new Request("http://localhost/api/checkout", {
      method: "POST",
      body: JSON.stringify({ items: [{ productId: 1, quantity: 1 }] }),
    })).then((response) => {
      responseResolved = true
      return response
    })

    await vi.waitFor(() => expect(finishFlush).toBeTypeOf("function"))
    expect(responseResolved).toBe(false)
    finishFlush()
    const response = await responsePromise

    expect(response.status).toBe(500)
    const responseText = await response.text()
    expect(responseText).toContain("Checkout could not be completed")
    expect(responseText).not.toContain("raw provider payload")
    expect(responseText).not.toContain("secret")
    expect(mocks.emitCheckoutLog).toHaveBeenCalledWith(expect.objectContaining({
      status: 500,
      outcome: "internal_error",
    }))
    const logInput = mocks.emitCheckoutLog.mock.calls[0][0]
    expect(Object.keys(logInput)).toEqual(["status", "durationMs", "outcome", "providerVersion", "requestId"])
    expect(JSON.stringify(logInput)).not.toContain("secret")
  })
})
