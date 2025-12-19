const KEY = "miren_cart_v2"

// --------------------
// helpers
// --------------------
function safeParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

// --------------------
// core
// --------------------
export function getCart() {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(KEY)
  const arr = raw ? safeParse(raw) : []

  // normalize (backward compatible)
  return Array.isArray(arr)
    ? arr.map((x) => ({
        priceId: x.priceId,
        title: x.title || x.name || x.priceId,
        imageUrl: x.imageUrl || null,
        qty: clamp(Number(x.qty) || 1, 1, 10),
      }))
    : []
}

export function setCart(items) {
  localStorage.setItem(KEY, JSON.stringify(items || []))
}

// --------------------
// mutations
// --------------------
export function addToCart(item, qty = 1) {
  /**
   * item = {
   *   priceId: "price_xxx",
   *   title: "MIREN Magazine – February",
   *   imageUrl?: "https://..."
   * }
   */
  if (!item?.priceId) return getCart()

  const cart = getCart()
  const i = cart.findIndex((x) => x.priceId === item.priceId)

  if (i >= 0) {
    cart[i].qty = clamp(cart[i].qty + qty, 1, 10)
  } else {
    cart.push({
      priceId: item.priceId,
      title: item.title || item.priceId,
      imageUrl: item.imageUrl || null,
      qty: clamp(qty, 1, 10),
    })
  }

  setCart(cart)
  return cart
}

export function updateQty(priceId, qty) {
  const cart = getCart()
  const i = cart.findIndex((x) => x.priceId === priceId)
  if (i < 0) return cart

  cart[i].qty = clamp(qty, 1, 10)
  setCart(cart)
  return cart
}

export function removeFromCart(priceId) {
  const cart = getCart().filter((x) => x.priceId !== priceId)
  setCart(cart)
  return cart
}

export function clearCart() {
  setCart([])
}
