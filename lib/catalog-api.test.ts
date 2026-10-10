import { afterEach, describe, expect, it, vi } from "vitest"

const logger = vi.hoisted(() => ({
  emitOperationalLog: vi.fn(),
  flushOperationalLogs: vi.fn(async () => {}),
}))

vi.mock("@/lib/app-logger", () => logger)

import { GET } from "@/app/api/products/route"

afterEach(() => vi.clearAllMocks())

describe("catalog API", () => {
  it("returns the catalog and logs only its safe item count", async () => {
    const response = await GET(new Request("http://localhost/api/products"))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.products).toHaveLength(6)
    expect(logger.emitOperationalLog).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "catalog.retrieval.completed",
      route: "/api/products",
      method: "GET",
      status: 200,
      outcome: "success",
      itemCount: 6,
    }))
    const logText = JSON.stringify(logger.emitOperationalLog.mock.calls)
    expect(logText).not.toContain(body.products[0].name)
    expect(logText).not.toContain(body.products[0].description)
    expect(logger.flushOperationalLogs).toHaveBeenCalledOnce()
  })

  it("rejects query input without logging catalog data", async () => {
    const response = await GET(new Request("http://localhost/api/products?search=backpack"))

    expect(response.status).toBe(400)
    expect(logger.emitOperationalLog).toHaveBeenCalledWith(expect.objectContaining({
      status: 400,
      outcome: "invalid_request",
    }))
    expect(logger.emitOperationalLog).not.toHaveBeenCalledWith(expect.objectContaining({
      itemCount: expect.anything(),
    }))
  })
})
