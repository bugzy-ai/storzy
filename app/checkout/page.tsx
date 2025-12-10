"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Header from "@/components/header"
import { PRODUCTS } from "@/lib/products"

export default function CheckoutPage() {
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [cart, setCart] = useState<{ [key: number]: number }>({})
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)

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

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    const newErrors: { [key: string]: string } = {}

    if (!firstName) newErrors.firstName = "First Name is required"
    if (!lastName) newErrors.lastName = "Last Name is required"
    if (!postalCode) newErrors.postalCode = "Postal Code is required"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Complete checkout
    localStorage.removeItem("cart")
    window.location.href = "/checkout-complete"
  }

  const cartItems = Object.entries(cart)
    .map(([id, quantity]) => ({
      product: PRODUCTS.find((p) => p.id === Number.parseInt(id)),
      quantity,
    }))
    .filter((item) => item.product)

  const subtotal = cartItems.reduce((sum, item) => sum + item.product!.price * item.quantity, 0)
  const tax = subtotal * 0.08
  const total = subtotal + tax
  const cartCount = Object.values(cart).reduce((sum, count) => sum + count, 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <Header cartCount={cartCount} currentUser={currentUser} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Checkout: Your Information</h2>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white rounded-lg p-8">
            <form onSubmit={handleCheckout} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">First Name</label>
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`w-full border-2 ${errors.firstName ? "border-red-500" : "border-slate-200"}`}
                    disabled={isLoading}
                  />
                  {errors.firstName && <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Last Name</label>
                  <Input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`w-full border-2 ${errors.lastName ? "border-red-500" : "border-slate-200"}`}
                    disabled={isLoading}
                  />
                  {errors.lastName && <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Postal Code</label>
                <Input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className={`w-full border-2 ${errors.postalCode ? "border-red-500" : "border-slate-200"}`}
                  disabled={isLoading}
                />
                {errors.postalCode && <p className="text-red-600 text-sm mt-1">{errors.postalCode}</p>}
              </div>

              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  onClick={() => (window.location.href = "/cart")}
                  className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Continue"}
                </Button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-lg p-6 h-fit">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h3>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.product!.id} className="text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>
                      {item.product!.name} x {item.quantity}
                    </span>
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
