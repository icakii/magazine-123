const KEY = "miren_cart_v1"

export function getCart() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setCart(items) {
  localStorage.setItem(KEY, JSON.stringify(items || []))
}

export function addToCart(priceId, qty = 1) {
  const cart = getCart()
  const i = cart.findIndex((x) => x.priceId === priceId)
  if (i >= 0) cart[i].qty = Math.min(10, cart[i].qty + qty)
  else cart.push({ priceId, qty: Math.max(1, Math.min(10, qty)) })
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
