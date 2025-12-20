// client/src/lib/cart.js
const KEY = "miren_cart_v1"

function safeRead() {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function safeWrite(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {}
}

export function getCart() {
  return safeRead()
}

export function clearCart() {
  safeWrite([])
  return []
}

export function setCart(next) {
  const arr = Array.isArray(next) ? next : []
  safeWrite(arr)
  return arr
}

export function addToCart(item, qty = 1) {
  const cart = safeRead()
  const priceId = String(item?.priceId || "")
  if (!priceId) return cart

  const addQty = Math.max(1, Math.min(50, Number(qty) || 1))
  const idx = cart.findIndex((x) => x.priceId === priceId)

  if (idx >= 0) {
    cart[idx] = {
      ...cart[idx],
      qty: Math.max(1, Math.min(50, (Number(cart[idx].qty) || 1) + addQty)),
      // keep newest title/image/price fields if provided
      title: item.title ?? cart[idx].title,
      imageUrl: item.imageUrl ?? cart[idx].imageUrl,
      unitAmount: item.unitAmount ?? cart[idx].unitAmount,
      currency: item.currency ?? cart[idx].currency,
    }
  } else {
    cart.push({
      priceId,
      title: item?.title || "Item",
      imageUrl: item?.imageUrl || "",
      qty: addQty,
      // ✅ price info (optional but we’ll use it for totals)
      unitAmount: typeof item?.unitAmount === "number" ? item.unitAmount : null, // cents
      currency: item?.currency ? String(item.currency).toUpperCase() : null,
    })
  }

  safeWrite(cart)
  return cart
}

export function removeFromCart(priceId) {
  const id = String(priceId || "")
  const cart = safeRead().filter((x) => x.priceId !== id)
  safeWrite(cart)
  return cart
}

export function setQty(priceId, qty) {
  const id = String(priceId || "")
  const nextQty = Math.max(1, Math.min(50, Number(qty) || 1))
  const cart = safeRead()

  const idx = cart.findIndex((x) => x.priceId === id)
  if (idx < 0) return cart

  cart[idx] = { ...cart[idx], qty: nextQty }
  safeWrite(cart)
  return cart
}

export function incQty(priceId) {
  const cart = safeRead()
  const id = String(priceId || "")
  const idx = cart.findIndex((x) => x.priceId === id)
  if (idx < 0) return cart
  return setQty(id, (Number(cart[idx].qty) || 1) + 1)
}

export function decQty(priceId) {
  const cart = safeRead()
  const id = String(priceId || "")
  const idx = cart.findIndex((x) => x.priceId === id)
  if (idx < 0) return cart

  const q = Number(cart[idx].qty) || 1
  if (q <= 1) {
    return removeFromCart(id)
  }
  return setQty(id, q - 1)
}

export function formatMoneyCents(cents, currency = "EUR") {
  const c = Number(cents)
  if (!Number.isFinite(c)) return ""
  const value = c / 100
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "EUR",
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${(currency || "EUR").toUpperCase()}`
  }
}

export function cartTotal(cart) {
  const arr = Array.isArray(cart) ? cart : []
  return arr.reduce((sum, x) => {
    const unit = Number(x.unitAmount)
    const qty = Number(x.qty) || 0
    if (!Number.isFinite(unit)) return sum
    return sum + unit * qty
  }, 0)
}
