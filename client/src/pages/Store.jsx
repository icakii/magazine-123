import { useEffect, useMemo, useState } from "react"
import { api } from "../lib/api"
import { addToCart, getCart, removeFromCart } from "../lib/cart"

const DEFAULT_RELEASE = "2026-02-27" // ако item няма release в DB

function ymdTodayUTC() {
  return new Date().toISOString().slice(0, 10)
}

function isReleased(releaseAt) {
  if (!releaseAt) return true
  return ymdTodayUTC() >= String(releaseAt).slice(0, 10)
}

// normalize snake_case -> camel-ish + keep originals too
function normalizeItem(raw) {
  const it = raw || {}
  return {
    ...it,

    // IDs
    id: it.id,

    // text
    title: it.title,
    description: it.description,

    // image
    imageUrl: it.imageUrl || it.image_url || null,

    // category
    category: it.category || "misc",

    // stripe
    stripePriceId:
      it.stripePriceId ||
      it.stripe_price_id ||
      it.stripe_priceId || // just in case someone named it weird
      it.priceId || // fallback
      null,

    // release
    releaseAt:
      it.releaseAt ||
      it.release_at ||
      it.release ||
      null,

    // active
    isActive:
      typeof it.isActive === "boolean"
        ? it.isActive
        : typeof it.is_active === "boolean"
          ? it.is_active
          : true,
  }
}

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
      } catch (e) {
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
    setCart(addToCart(priceId, 1))
    openCart()
  }

  // UI label tweak (Magazine вместо E-Magazine)
  const prettyTitle = (t) => {
    if (!t) return ""
    return String(t).replace(/e-?magazine/gi, "Magazine")
  }

  return (
    <div className="page">
      <div className="store-head">
        <div>
          <h2 className="headline">Store</h2>
          <p className="subhead">Magazine & clothing — powered by Stripe.</p>

          {!loading && err && <p className="msg warning">{err}</p>}

          {!loading && !err && items.length === 0 && (
            <p className="msg">No items yet. Coming soon.</p>
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
          {items.map((it) => {
            const releaseAt = it.releaseAt || DEFAULT_RELEASE
            const locked = !isReleased(releaseAt)

            return (
              <div
                key={it.id || it.stripePriceId || Math.random()}
                className={`store-card ${locked ? "locked" : ""}`}
              >
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
                    <div className="store-desc">
                      {String(it.description).replace(/e-?magazine/gi, "Magazine")}
                    </div>
                  )}

                  {locked ? (
                    <button className="btn outline store-btn" disabled type="button">
                      Order on 27 Feb 🔒
                    </button>
                  ) : (
                    <button
                      className="btn primary store-btn"
                      onClick={() => addItem(it)}
                      type="button"
                    >
                      Add to cart
                    </button>
                  )}
                </div>
              </div>
            )
          })}
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
              {cart.map((c) => (
                <div key={c.priceId} className="cart-row">
                  <div className="cart-priceid">{c.priceId}</div>
                  <div className="cart-qty">x{c.qty}</div>
                  <button
                    className="cart-remove"
                    onClick={() => setCart(removeFromCart(c.priceId))}
                    type="button"
                  >
                    remove
                  </button>
                </div>
              ))}
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
