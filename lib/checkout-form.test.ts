import { describe, expect, it } from "vitest"
import {
  buildCheckoutRequestBody,
  DEMO_CARD,
  getShippingFee,
  type PaymentDetails,
  type ShippingDetails,
  validatePaymentDetails,
  validateShippingDetails,
} from "./checkout-form"

const shippingDetails: ShippingDetails = {
  firstName: "Demo",
  lastName: "Shopper",
  addressLine: "123 Example Street",
  city: "Sample City",
  postalCode: "12345",
  country: "us",
  shippingMethod: "",
}

const paymentDetails: PaymentDetails = {
  cardholderName: "Demo Shopper",
  cardNumber: DEMO_CARD.number,
  expiration: DEMO_CARD.expiration,
  securityCode: DEMO_CARD.securityCode,
}

describe("checkout form validation", () => {
  it("requires a complete shipping address", () => {
    expect(validateShippingDetails({
      ...shippingDetails,
      addressLine: "",
      city: "",
      country: "",
    }, false)).toEqual({
      addressLine: "Address is required",
      city: "City is required",
      country: "Country is required",
    })
  })

  it("requires a shipping method only when the improved checkout enables it", () => {
    expect(validateShippingDetails(shippingDetails, false)).toEqual({})
    expect(validateShippingDetails(shippingDetails, true)).toEqual({
      shippingMethod: "Shipping method is required",
    })
  })

  it("calculates the advertised shipping fees", () => {
    expect(getShippingFee("standard")).toBe(0)
    expect(getShippingFee("express")).toBe(9.99)
    expect(getShippingFee("overnight")).toBe(19.99)
  })

  it("accepts only the documented demo payment values", () => {
    expect(validatePaymentDetails(paymentDetails)).toEqual({})
    expect(validatePaymentDetails({
      ...paymentDetails,
      cardNumber: "5555 5555 5555 4444",
      expiration: "01/30",
      securityCode: "999",
    })).toEqual({
      cardNumber: "Use the demo card number shown above",
      expiration: "Use the demo expiration shown above",
      securityCode: "Use the demo security code shown above",
    })
  })
})

describe("checkout request privacy boundary", () => {
  it("serializes only product IDs and quantities", () => {
    const requestBody = buildCheckoutRequestBody({ 1: 2, 4: 1 })
    const serialized = JSON.stringify(requestBody)

    expect(requestBody).toEqual({
      items: [
        { productId: 1, quantity: 2 },
        { productId: 4, quantity: 1 },
      ],
    })
    for (const value of [...Object.values(shippingDetails), ...Object.values(paymentDetails)]) {
      if (value) expect(serialized).not.toContain(value)
    }
  })
})
