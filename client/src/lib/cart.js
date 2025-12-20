// client/src/lib/cart.js

const KEY = "miren_cart_v1"

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json)
    return v ?? fallback
  } catch {
    return fallback
  }
}

export function getCart() {
  if (typeof window === "undefined") return []
  const raw = window.localStorage.getItem(KEY)
  const arr = raw ? safeParse(raw, []) : []
  return Array.isArray(arr) ? arr : []
}

function saveCart(next) {
  if (typeof window === "undefined") return next
  window.localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function clearCart() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(KEY)
}

export function addToCart(item, qty = 1) {
  const q = Math.max(1, Math.min(99, Number(qty) || 1))
  const cart = getCart()

  const priceId = String(item?.priceId || "")
  if (!priceId) return cart

  const idx = cart.findIndex((x) => x.priceId === priceId)

  if (idx >= 0) {
    const next = [...cart]
    next[idx] = { ...next[idx], qty: Math.max(1, Math.min(99, (next[idx].qty || 1) + q)) }
    return saveCart(next)
  }

  const next = [
    ...cart,
    {
      priceId,
      title: item?.title || "Item",
      imageUrl: item?.imageUrl || "",
      unitAmount: Number(item?.unitAmount) || null, // in cents
      currency: item?.currency || "eur",
      qty: q,
    },
  ]

  return saveCart(next)
}

export function removeFromCart(priceId) {
  const cart = getCart()
  const next = cart.filter((x) => x.priceId !== priceId)
  return saveCart(next)
}

export function setQty(priceId, qty) {
  const cart = getCart()
  const q = Number(qty)
  if (!Number.isFinite(q)) return cart

  if (q <= 0) {
    return removeFromCart(priceId)
  }

  const next = cart.map((x) =>
    x.priceId === priceId ? { ...x, qty: Math.max(1, Math.min(99, Math.floor(q))) } : x
  )
  return saveCart(next)
}

export function incQty(priceId, step = 1) {
  const cart = getCart()
  const idx = cart.findIndex((x) => x.priceId === priceId)
  if (idx < 0) return cart
  const next = [...cart]
  const curr = Number(next[idx].qty) || 1
  next[idx] = { ...next[idx], qty: Math.max(1, Math.min(99, curr + (Number(step) || 1))) }
  return saveCart(next)
}

export function decQty(priceId, step = 1) {
  const cart = getCart()
  const idx = cart.findIndex((x) => x.priceId === priceId)
  if (idx < 0) return cart
  const next = [...cart]
  const curr = Number(next[idx].qty) || 1
  const q = curr - (Number(step) || 1)
  if (q <= 0) return removeFromCart(priceId)
  next[idx] = { ...next[idx], qty: q }
  return saveCart(next)
}

export function formatMoneyCents(amountCents, currency = "eur") {
  const cents = Number(amountCents)
  if (!Number.isFinite(cents)) return ""
  const value = cents / 100

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency || "eur").toUpperCase(),
    }).format(value)
  } catch {
    // fallback
    return `${value.toFixed(2)} ${String(currency || "eur").toUpperCase()}`
  }
}
