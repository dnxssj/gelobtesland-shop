import React from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'gelobtes-land-cart'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
  })

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(items)), [items])

  const addItem = (product, quantity = 1) => setItems((current) => {
    const existing = current.find((item) => item.id === product.id)
    if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item)
    return [...current, { ...product, quantity }]
  })
  const updateQuantity = (id, quantity) => setItems((current) => quantity <= 0 ? current.filter((item) => item.id !== id) : current.map((item) => item.id === id ? { ...item, quantity } : item))
  const removeItem = (id) => setItems((current) => current.filter((item) => item.id !== id))
  const clear = () => setItems([])
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const value = useMemo(() => ({ items, addItem, updateQuantity, removeItem, clear, count, subtotal }), [items, count, subtotal])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}

