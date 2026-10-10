import { afterEach, describe, expect, it, vi } from "vitest"

const logger = vi.hoisted(() => ({
  emitOperationalLog: vi.fn(),
  flushOperationalLogs: vi.fn(async () => {}),
}))

vi.mock("@/lib/app-logger", () => logger)

import { POST } from "@/app/api/login/route"

afterEach(() => vi.clearAllMocks())

describe("login API", () => {
  it("logs successful authentication without credentials", async () => {
    const response = await POST(new Request("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({ username: "test_user", password: "password" }),
    }))

    expect(response.status).toBe(200)
    const responseText = await response.text()
    expect(responseText).not.toContain("test_user")
    expect(responseText).not.toContain("password")
    expect(logger.emitOperationalLog).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "authentication.completed",
      route: "/api/login",
      method: "POST",
      status: 200,
      outcome: "success",
    }))
    expect(JSON.stringify(logger.emitOperationalLog.mock.calls)).not.toMatch(/test_user|password/)
    expect(logger.flushOperationalLogs).toHaveBeenCalledOnce()
  })

  it("returns and logs a sanitized credential rejection", async () => {
    const response = await POST(new Request("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({ username: "private-user", password: "private-password" }),
    }))

    expect(response.status).toBe(401)
    expect(await response.text()).not.toMatch(/private-user|private-password/)
    expect(logger.emitOperationalLog).toHaveBeenCalledWith(expect.objectContaining({
      status: 401,
      outcome: "invalid_credentials",
    }))
    expect(JSON.stringify(logger.emitOperationalLog.mock.calls)).not.toMatch(/private-user|private-password/)
  })

  it("rejects unexpected request fields", async () => {
    const response = await POST(new Request("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({ username: "test_user", password: "password", remember: true }),
    }))

    expect(response.status).toBe(400)
    expect(logger.emitOperationalLog).toHaveBeenCalledWith(expect.objectContaining({
      status: 400,
      outcome: "invalid_request",
    }))
  })
})
