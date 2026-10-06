import { afterEach, describe, expect, it, vi } from "vitest"

const telemetry = vi.hoisted(() => ({
  emitCheckoutLog: vi.fn(),
  flushCheckoutLogs: vi.fn(async () => {}),
}))

vi.mock("@/lib/checkout-telemetry", () => telemetry)

import { POST } from "@/app/api/checkout/route"
import { completeCheckout } from "./submit-checkout"

afterEach(() => {
  vi.clearAllMocks()
})

describe("checkout API", () => {
  it("completes a valid V1 checkout and flushes its telemetry", async () => {
    const response = await POST(new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [{ productId: 2, quantity: 101 }] }),
    }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ ok: true, requestId: response.headers.get("x-request-id") })
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(telemetry.emitCheckoutLog).toHaveBeenCalledWith(expect.objectContaining({
      status: 200,
      outcome: "success",
      requestId: body.requestId,
    }))
    expect(telemetry.flushCheckoutLogs).toHaveBeenCalledOnce()
  })

  it("rejects malformed and invalid input with sanitized errors and telemetry", async () => {
    const malformed = await POST(new Request("http://localhost/api/checkout", {
      method: "POST",
      body: "not-json",
    }))
    expect(malformed.status).toBe(400)
    expect(await malformed.json()).toMatchObject({ ok: false, error: "Invalid checkout request." })

    const invalid = await POST(new Request("http://localhost/api/checkout", {
      method: "POST",
      body: JSON.stringify({ items: [{ productId: 0, quantity: -1 }], firstName: "Sensitive Name" }),
    }))
    expect(invalid.status).toBe(400)
    expect(await invalid.text()).not.toContain("Sensitive Name")
    expect(telemetry.emitCheckoutLog).toHaveBeenLastCalledWith(expect.objectContaining({
      status: 400,
      outcome: "invalid_request",
    }))
    expect(telemetry.flushCheckoutLogs).toHaveBeenCalledTimes(2)
  })
})

describe("checkout UI submission effects", () => {
  it("clears cart and navigates only after successful API response", async () => {
    const clearCart = vi.fn()
    const navigate = vi.fn()
    const submit = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }))

    await expect(completeCheckout([{ productId: 1, quantity: 1 }], {
      submit,
      clearCart,
      navigateToCompletion: navigate,
    })).resolves.toBe(true)
    expect(clearCart).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledOnce()
  })

  it("preserves cart and stays on checkout on failures", async () => {
    const clearCart = vi.fn()
    const navigate = vi.fn()
    const submit = vi.fn(async () => { throw new Error("private transport detail") })

    await expect(completeCheckout([{ productId: 1, quantity: 1 }], {
      submit,
      clearCart,
      navigateToCompletion: navigate,
    })).resolves.toBe(false)
    expect(clearCart).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it.each([
    ["non-success HTTP response", async () => ({ ok: false, json: async () => ({ ok: true }) })],
    ["malformed success response", async () => ({ ok: true, json: async () => ({ message: "missing success marker" }) })],
  ])("preserves cart and stays on checkout for a %s", async (_case, submitResponse) => {
    const clearCart = vi.fn()
    const navigate = vi.fn()

    await expect(completeCheckout([{ productId: 1, quantity: 1 }], {
      submit: vi.fn(submitResponse),
      clearCart,
      navigateToCompletion: navigate,
    })).resolves.toBe(false)
    expect(clearCart).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
