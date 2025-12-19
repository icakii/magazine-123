import { useEffect, useMemo, useState } from "react"
import { api } from "../lib/api"
import { addToCart, getCart, removeFromCart } from "../lib/cart"

function normalizeItem(raw) {
  const it = raw || {}
  return {
    ...it,
    id: it.id,
    title: it.title,
    description: it.description,
    imageUrl: it.imageUrl || it.image_url || null,
    category: it.category || "misc",
    stripePriceId: it.stripePriceId || it.stripe_price_id || it.priceId || null,
    isActive:
      typeof it.isActive === "boolean"
        ? it.isActive
        : typeof it.is_active === "boolean"
          ? it.is_active
          : true,
  }
}
const STORE_RELEASE = "2026-02-27"
function ymdTodayUTC() {
  return new Date().toISOString().slice(0, 10)
}
function isStoreOpen() {
  return ymdTodayUTC() >= STORE_RELEASE
}


const prettyTitle = (t) =>
  t ? String(t).replace(/e-?magazine/gi, "Magazine") : ""

export default function Store() {
  const [items, setItems] = useState([])
  const [cart, setCart] = useState(getCart())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        setLoading(true)
        setErr("")
        const res = await api.get("/store/items")
        if (!alive) return

        const arr = Array.isArray(res.data) ? res.data : []
        const normalized = arr.map(normalizeItem).filter((x) => x && x.isActive)

        setItems(normalized)
      } catch {
        if (!alive) return
        setErr("Failed to load store.")
        setItems([])
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  // ✅ Map: priceId -> item (for showing titles inside cart)
  const priceToItem = useMemo(() => {
    const m = new Map()
    for (const it of items) {
      if (it?.stripePriceId) m.set(it.stripePriceId, it)
    }
    return m
  }, [items])

  const cartCount = useMemo(
    () => cart.reduce((a, b) => a + (Number(b.qty) || 0), 0),
    [cart]
  )

  const openCart = () => document.body.classList.add("cart-open")
  const closeCart = () => document.body.classList.remove("cart-open")
  const toggleCart = () => document.body.classList.toggle("cart-open")

  const startCheckout = async () => {
    try {
      if (!cart?.length) return
      const res = await api.post("/store/checkout", {
        items: cart,
        successPath: "/profile?order_success=true",
        cancelPath: "/store?canceled=true",
      })
      if (res?.data?.url) window.location.href = res.data.url
      else alert("Checkout failed: missing url.")
    } catch {
      alert("Checkout failed.")
    }
  }

  const addItem = (it) => {
    const priceId = it?.stripePriceId
    if (!priceId) {
      alert("This item is missing Stripe priceId (stripe_price_id).")
      return
    }
    setCart(addToCart(
  {
    priceId: it.priceId,
    title: it.title,
    imageUrl: it.imageUrl,
  },
  1
)
)
    openCart()
  }

  return (
    <div className="page">
      <div className="store-head">
        <div>
          <h2 className="headline">Store</h2>
          <p className="subhead">Magazine & clothing — powered by Stripe.</p>

          {!loading && err && <p className="msg warning">{err}</p>}

          {!loading && !err && items.length === 0 && (
            <p className="msg">No items yet. Add one in DB.</p>
          )}
        </div>

        <button className="cart-fab" onClick={toggleCart} type="button">
          Cart <span className="cart-badge">{cartCount}</span>
        </button>
      </div>

      {loading ? (
        <p className="subhead">Loading…</p>
      ) : (
        <div className="store-grid">
          {items.map((it) => (
            <div key={it.id || it.stripePriceId} className="store-card">
              {it.imageUrl && (
                <img
                  className="store-img"
                  src={it.imageUrl}
                  alt={prettyTitle(it.title)}
                  loading="lazy"
                />
              )}

              <div className="store-body">
                <div className="store-title">{prettyTitle(it.title)}</div>
                {it.description && (
                  <div className="store-desc">{it.description}</div>
                )}

                <button
                  className="btn primary store-btn"
                  onClick={() => addItem(it)}
                  type="button"
                >
                  Add to cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CART DRAWER */}
      <div className="cart-drawer">
        <div className="cart-top">
          <div className="cart-title">Your Cart</div>
          <button className="cart-close" onClick={closeCart} type="button">
            ✕
          </button>
        </div>

        {cart.length === 0 ? (
          <p className="text-muted">Cart is empty.</p>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((c) => {
                const it = priceToItem.get(c.priceId)
                const title = it?.title ? prettyTitle(it.title) : null
                return (
                  <div key={c.priceId} className="cart-row">
                    <div className="cart-priceid">
                      {title || c.priceId}
                      {it?.category ? (
                        <span className="cart-tag">{it.category}</span>
                      ) : null}
                    </div>

                    <div className="cart-qty">x{c.qty}</div>

                    <button
                      className="cart-remove"
                      onClick={() => setCart(removeFromCart(c.priceId))}
                      type="button"
                    >
                      remove
                    </button>
                  </div>
                )
              })}
            </div>

            <button
              className="btn primary cart-checkout"
              onClick={startCheckout}
              type="button"
            >
              Checkout with Stripe ⚡
            </button>
          </>
        )}
      </div>

      <div className="cart-backdrop" onClick={closeCart} />
    </div>
  )
}
