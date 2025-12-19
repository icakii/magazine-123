import { useEffect, useMemo, useState } from "react"
import { api } from "../lib/api"
import { addToCart, getCart, removeFromCart } from "../lib/cart"

const RELEASE = "2026-02-27" // промени година ако трябва

function ymdTodayUTC() {
  return new Date().toISOString().slice(0, 10)
}

function isReleased(releaseAt) {
  if (!releaseAt) return true
  return ymdTodayUTC() >= String(releaseAt).slice(0, 10)
}

export default function Store() {
  const [items, setItems] = useState([])
  const [cart, setCart] = useState(getCart())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  useEffect(() => {
    api.get("/store/items")
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setErr("Failed to load store."))
      .finally(() => setLoading(false))
  }, [])

  const cartCount = useMemo(() => cart.reduce((a, b) => a + (b.qty || 0), 0), [cart])

  const startCheckout = async () => {
    try {
      const res = await api.post("/store/checkout", {
        items: cart,
        successPath: "/profile?order_success=true",
        cancelPath: "/store?canceled=true",
      })
      if (res?.data?.url) window.location.href = res.data.url
    } catch {
      alert("Checkout failed.")
    }
  }

  if (loading) return <div className="page"><h2 className="headline">Store</h2><p className="subhead">Loading…</p></div>

  return (
    <div className="page">
      <div className="store-head">
        <div>
          <h2 className="headline">Store</h2>
          <p className="subhead">E-magazine & clothing — powered by Stripe.</p>
          {err && <p className="msg warning">{err}</p>}
        </div>

        <button className="cart-fab" onClick={() => document.body.classList.toggle("cart-open")}>
          Cart <span className="cart-badge">{cartCount}</span>
        </button>
      </div>

      <div className="store-grid">
        {items.map((it) => {
          const locked = !isReleased(it.releaseAt || RELEASE)
          return (
            <div key={it.id} className={`store-card ${locked ? "locked" : ""}`}>
              {it.imageUrl && <img className="store-img" src={it.imageUrl} alt={it.title} />}
              <div className="store-body">
                <div className="store-title">{it.title}</div>
                {it.description && <div className="store-desc">{it.description}</div>}

                {locked ? (
                  <button className="btn outline store-btn" disabled>
                    Order on 27 Feb 🔒
                  </button>
                ) : (
                  <button
                    className="btn primary store-btn"
                    onClick={() => setCart(addToCart(it.priceId, 1))}
                  >
                    Add to cart
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* CART DRAWER */}
      <div className="cart-drawer">
        <div className="cart-top">
          <div className="cart-title">Your Cart</div>
          <button className="cart-close" onClick={() => document.body.classList.remove("cart-open")}>✕</button>
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
                  <button className="cart-remove" onClick={() => setCart(removeFromCart(c.priceId))}>
                    remove
                  </button>
                </div>
              ))}
            </div>

            <button className="btn primary cart-checkout" onClick={startCheckout}>
              Checkout with Stripe ⚡
            </button>
          </>
        )}
      </div>

      <div className="cart-backdrop" onClick={() => document.body.classList.remove("cart-open")} />
    </div>
  )
}
