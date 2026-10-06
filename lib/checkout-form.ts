import type { CheckoutItem } from "./checkout-v1"

export const DEMO_CARD = {
  number: "4111 1111 1111 1111",
  expiration: "12/34",
  securityCode: "123",
} as const

export interface ShippingDetails {
  firstName: string
  lastName: string
  addressLine: string
  city: string
  postalCode: string
  country: string
  shippingMethod: string
}

export interface PaymentDetails {
  cardholderName: string
  cardNumber: string
  expiration: string
  securityCode: string
}

export type FormErrors<T> = Partial<Record<keyof T, string>>

export function validateShippingDetails(
  details: ShippingDetails,
  requireShippingMethod: boolean,
): FormErrors<ShippingDetails> {
  const errors: FormErrors<ShippingDetails> = {}

  if (!details.firstName.trim()) errors.firstName = "First Name is required"
  if (!details.lastName.trim()) errors.lastName = "Last Name is required"
  if (!details.addressLine.trim()) errors.addressLine = "Address is required"
  if (!details.city.trim()) errors.city = "City is required"
  if (!details.postalCode.trim()) errors.postalCode = "Postal Code is required"
  if (!details.country) errors.country = "Country is required"
  if (requireShippingMethod && !details.shippingMethod) {
    errors.shippingMethod = "Shipping method is required"
  }

  return errors
}

export function validatePaymentDetails(details: PaymentDetails): FormErrors<PaymentDetails> {
  const errors: FormErrors<PaymentDetails> = {}
  const cardNumber = details.cardNumber.replace(/\s/g, "")

  if (!details.cardholderName.trim()) errors.cardholderName = "Cardholder Name is required"
  if (!details.cardNumber.trim()) {
    errors.cardNumber = "Card Number is required"
  } else if (cardNumber !== DEMO_CARD.number.replace(/\s/g, "")) {
    errors.cardNumber = "Use the demo card number shown above"
  }
  if (!details.expiration.trim()) {
    errors.expiration = "Expiration is required"
  } else if (details.expiration.trim() !== DEMO_CARD.expiration) {
    errors.expiration = "Use the demo expiration shown above"
  }
  if (!details.securityCode.trim()) {
    errors.securityCode = "Security Code is required"
  } else if (details.securityCode.trim() !== DEMO_CARD.securityCode) {
    errors.securityCode = "Use the demo security code shown above"
  }

  return errors
}

export function getShippingFee(shippingMethod: string) {
  if (shippingMethod === "express") return 9.99
  if (shippingMethod === "overnight") return 19.99
  return 0
}

export function buildCheckoutRequestBody(cart: Record<number, number>): { items: CheckoutItem[] } {
  return {
    items: Object.entries(cart).map(([productId, quantity]) => ({
      productId: Number.parseInt(productId, 10),
      quantity,
    })),
  }
}
