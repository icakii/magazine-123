const KEY = "miren_cart_v1"

export function getCart() {
  try {
    const raw = localStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function setCart(items) {
  localStorage.setItem(KEY, JSON.stringify(items || []))
}

export function addToCart(item, qty = 1) {
  // item: { priceId, title?, imageUrl? }
  const priceId = typeof item === "string" ? item : item?.priceId
  if (!priceId) return getCart()

  const title = typeof item === "object" ? item.title : ""
  const imageUrl = typeof item === "object" ? item.imageUrl : ""

  const cart = getCart()
  const i = cart.findIndex((x) => x.priceId === priceId)

  if (i >= 0) {
    cart[i].qty = Math.min(10, (Number(cart[i].qty) || 0) + qty)
    // keep freshest details
    if (title) cart[i].title = title
    if (imageUrl) cart[i].imageUrl = imageUrl
  } else {
    cart.push({
      priceId,
      qty: Math.max(1, Math.min(10, qty)),
      title: title || "",
      imageUrl: imageUrl || "",
    })
  }

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
