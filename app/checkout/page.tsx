"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Header from "@/components/header"
import {
  buildCheckoutRequestBody,
  DEMO_CARD,
  getShippingFee,
  type PaymentDetails,
  type ShippingDetails,
  validatePaymentDetails,
  validateShippingDetails,
} from "@/lib/checkout-form"
import { PRODUCTS } from "@/lib/products"
import { completeCheckout } from "@/lib/submit-checkout"

type CheckoutStep = "shipping" | "payment"

const EMPTY_SHIPPING_DETAILS: ShippingDetails = {
  firstName: "",
  lastName: "",
  addressLine: "",
  city: "",
  postalCode: "",
  country: "",
  shippingMethod: "",
}

const EMPTY_PAYMENT_DETAILS: PaymentDetails = {
  cardholderName: "",
  cardNumber: "",
  expiration: "",
  securityCode: "",
}

export default function CheckoutPage() {
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [cart, setCart] = useState<{ [key: number]: number }>({})
  const [step, setStep] = useState<CheckoutStep>("shipping")
  const [shippingDetails, setShippingDetails] = useState(EMPTY_SHIPPING_DETAILS)
  const [paymentDetails, setPaymentDetails] = useState(EMPTY_PAYMENT_DETAILS)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [checkoutError, setCheckoutError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const isImprovedCheckout = process.env.NEXT_PUBLIC_IMPROVED_CHECKOUT === "true"

  useEffect(() => {
    const user = localStorage.getItem("currentUser")
    if (!user) {
      window.location.href = "/"
    }
    setCurrentUser(user)

    const savedCart = localStorage.getItem("cart")
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
  }, [])

  const updateShipping = (field: keyof ShippingDetails, value: string) => {
    setShippingDetails((current) => ({ ...current, [field]: value }))
  }

  const updatePayment = (field: keyof PaymentDetails, value: string) => {
    setPaymentDetails((current) => ({ ...current, [field]: value }))
  }

  const handleShippingSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setCheckoutError("")
    const shippingErrors = validateShippingDetails(shippingDetails, isImprovedCheckout)

    if (Object.keys(shippingErrors).length > 0) {
      setErrors(shippingErrors)
      return
    }

    setErrors({})
    setStep("payment")
  }

  const handleCheckout = async (event: React.FormEvent) => {
    event.preventDefault()
    setCheckoutError("")
    const paymentErrors = validatePaymentDetails(paymentDetails)

    if (Object.keys(paymentErrors).length > 0) {
      setErrors(paymentErrors)
      return
    }

    setErrors({})
    setIsLoading(true)
    const requestBody = buildCheckoutRequestBody(cart)
    const succeeded = await completeCheckout(requestBody.items, {
      submit: () => fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }),
      clearCart: () => localStorage.removeItem("cart"),
      navigateToCompletion: () => { window.location.href = "/checkout-complete" },
    })

    if (!succeeded) {
      setIsLoading(false)
      setCheckoutError("Checkout could not be completed. Please try again.")
    }
  }

  const handleBackToShipping = () => {
    setErrors({})
    setCheckoutError("")
    setStep("shipping")
  }

  const cartItems = Object.entries(cart)
    .map(([id, quantity]) => ({
      product: PRODUCTS.find((product) => product.id === Number.parseInt(id)),
      quantity,
    }))
    .filter((item) => item.product)

  const subtotal = cartItems.reduce((sum, item) => sum + item.product!.price * item.quantity, 0)
  const tax = subtotal * 0.08
  const shippingFee = isImprovedCheckout ? getShippingFee(shippingDetails.shippingMethod) : 0
  const total = subtotal + tax + shippingFee
  const cartCount = Object.values(cart).reduce((sum, count) => sum + count, 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <Header cartCount={cartCount} currentUser={currentUser} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">Checkout</h2>
        <div className="flex items-center gap-3 mb-8 text-sm" aria-label="Checkout progress">
          <span className={`font-semibold ${step === "shipping" ? "text-primary" : "text-slate-500"}`}>1. Shipping</span>
          <span className="text-slate-300">—</span>
          <span className={`font-semibold ${step === "payment" ? "text-primary" : "text-slate-500"}`}>2. Payment</span>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white rounded-lg p-8">
            {checkoutError && <p role="alert" className="mb-6 text-red-600">{checkoutError}</p>}

            {step === "shipping" ? (
              <form onSubmit={handleShippingSubmit} autoComplete="off" className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Shipping Address</h3>
                  <p className="text-sm text-slate-600 mt-1">Enter the address where this demo order would be delivered.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-900 mb-2">First Name</label>
                    <Input
                      id="firstName"
                      value={shippingDetails.firstName}
                      onChange={(event) => updateShipping("firstName", event.target.value)}
                      className={`w-full border-2 ${errors.firstName ? "border-red-500" : "border-slate-200"}`}
                    />
                    {errors.firstName && <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-900 mb-2">Last Name</label>
                    <Input
                      id="lastName"
                      value={shippingDetails.lastName}
                      onChange={(event) => updateShipping("lastName", event.target.value)}
                      className={`w-full border-2 ${errors.lastName ? "border-red-500" : "border-slate-200"}`}
                    />
                    {errors.lastName && <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="addressLine" className="block text-sm font-medium text-slate-900 mb-2">Address Line</label>
                  <Input
                    id="addressLine"
                    value={shippingDetails.addressLine}
                    onChange={(event) => updateShipping("addressLine", event.target.value)}
                    className={`w-full border-2 ${errors.addressLine ? "border-red-500" : "border-slate-200"}`}
                  />
                  {errors.addressLine && <p className="text-red-600 text-sm mt-1">{errors.addressLine}</p>}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-slate-900 mb-2">City</label>
                    <Input
                      id="city"
                      value={shippingDetails.city}
                      onChange={(event) => updateShipping("city", event.target.value)}
                      className={`w-full border-2 ${errors.city ? "border-red-500" : "border-slate-200"}`}
                    />
                    {errors.city && <p className="text-red-600 text-sm mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-slate-900 mb-2">Postal Code</label>
                    <Input
                      id="postalCode"
                      value={shippingDetails.postalCode}
                      onChange={(event) => updateShipping("postalCode", event.target.value)}
                      className={`w-full border-2 ${errors.postalCode ? "border-red-500" : "border-slate-200"}`}
                    />
                    {errors.postalCode && <p className="text-red-600 text-sm mt-1">{errors.postalCode}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-slate-900 mb-2">Country</label>
                  <select
                    id="country"
                    value={shippingDetails.country}
                    onChange={(event) => updateShipping("country", event.target.value)}
                    className={`w-full border-2 rounded px-4 py-2 bg-white ${errors.country ? "border-red-500" : "border-slate-200"}`}
                  >
                    <option value="">Select Country</option>
                    <option value="us">United States</option>
                    <option value="ca">Canada</option>
                    <option value="uk">United Kingdom</option>
                    <option value="de">Germany</option>
                    <option value="fr">France</option>
                    <option value="bg">Bulgaria</option>
                  </select>
                  {errors.country && <p className="text-red-600 text-sm mt-1">{errors.country}</p>}
                </div>

                {isImprovedCheckout && (
                  <div>
                    <span className="block text-sm font-medium text-slate-900 mb-2">Shipping Method</span>
                    <div className="space-y-2">
                      {[
                        ["standard", "Standard Shipping (5-7 days) - Free"],
                        ["express", "Express Shipping (2-3 days) - $9.99"],
                        ["overnight", "Overnight Shipping (1 day) - $19.99"],
                      ].map(([value, label]) => (
                        <label key={value} className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-slate-50">
                          <input
                            type="radio"
                            name="shippingMethod"
                            value={value}
                            checked={shippingDetails.shippingMethod === value}
                            onChange={(event) => updateShipping("shippingMethod", event.target.value)}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    {errors.shippingMethod && <p className="text-red-600 text-sm mt-1">{errors.shippingMethod}</p>}
                  </div>
                )}

                <div className="flex gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    onClick={() => (window.location.href = "/cart")}
                    className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold">
                    Continue to Payment
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCheckout} autoComplete="off" className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Demo Payment</h3>
                  <p className="text-sm text-slate-600 mt-1">Complete the simulated payment to place this demo order.</p>
                </div>

                <div role="note" className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-amber-950">
                  <p className="font-bold">Demo only — do not enter real card information.</p>
                  <p className="text-sm mt-2">
                    Use card <code className="font-mono font-semibold">{DEMO_CARD.number}</code>, expiration{" "}
                    <code className="font-mono font-semibold">{DEMO_CARD.expiration}</code>, and security code{" "}
                    <code className="font-mono font-semibold">{DEMO_CARD.securityCode}</code>.
                  </p>
                </div>

                <div>
                  <label htmlFor="cardholderName" className="block text-sm font-medium text-slate-900 mb-2">Cardholder Name</label>
                  <Input
                    id="cardholderName"
                    value={paymentDetails.cardholderName}
                    onChange={(event) => updatePayment("cardholderName", event.target.value)}
                    className={`w-full border-2 ${errors.cardholderName ? "border-red-500" : "border-slate-200"}`}
                    disabled={isLoading}
                  />
                  {errors.cardholderName && <p className="text-red-600 text-sm mt-1">{errors.cardholderName}</p>}
                </div>

                <div>
                  <label htmlFor="cardNumber" className="block text-sm font-medium text-slate-900 mb-2">Card Number</label>
                  <Input
                    id="cardNumber"
                    inputMode="numeric"
                    value={paymentDetails.cardNumber}
                    onChange={(event) => updatePayment("cardNumber", event.target.value.slice(0, 19))}
                    placeholder={DEMO_CARD.number}
                    className={`w-full border-2 font-mono ${errors.cardNumber ? "border-red-500" : "border-slate-200"}`}
                    disabled={isLoading}
                  />
                  {errors.cardNumber && <p className="text-red-600 text-sm mt-1">{errors.cardNumber}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiration" className="block text-sm font-medium text-slate-900 mb-2">Expiration</label>
                    <Input
                      id="expiration"
                      inputMode="numeric"
                      value={paymentDetails.expiration}
                      onChange={(event) => updatePayment("expiration", event.target.value.slice(0, 5))}
                      placeholder={DEMO_CARD.expiration}
                      className={`w-full border-2 font-mono ${errors.expiration ? "border-red-500" : "border-slate-200"}`}
                      disabled={isLoading}
                    />
                    {errors.expiration && <p className="text-red-600 text-sm mt-1">{errors.expiration}</p>}
                  </div>
                  <div>
                    <label htmlFor="securityCode" className="block text-sm font-medium text-slate-900 mb-2">Security Code</label>
                    <Input
                      id="securityCode"
                      type="password"
                      inputMode="numeric"
                      value={paymentDetails.securityCode}
                      onChange={(event) => updatePayment("securityCode", event.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder={DEMO_CARD.securityCode}
                      className={`w-full border-2 font-mono ${errors.securityCode ? "border-red-500" : "border-slate-200"}`}
                      disabled={isLoading}
                    />
                    {errors.securityCode && <p className="text-red-600 text-sm mt-1">{errors.securityCode}</p>}
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    onClick={handleBackToShipping}
                    className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold"
                    disabled={isLoading}
                  >
                    Back to Shipping
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : `Pay $${total.toFixed(2)} (Demo)`}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 h-fit">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h3>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.product!.id} className="text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>{item.product!.name} x {item.quantity}</span>
                    <span>${(item.product!.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax:</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              {isImprovedCheckout && (
                <div className="flex justify-between text-slate-600">
                  <span>Shipping:</span>
                  <span>{shippingFee === 0 ? "Free" : `$${shippingFee.toFixed(2)}`}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
