// client/src/pages/Store.jsx
import { useEffect, useMemo, useState } from "react"
import { api } from "../lib/api"
import {
  addToCart,
  getCart,
  removeFromCart,
  clearCart,
  setQty,
  incQty,
  decQty,
  formatMoneyCents,
} from "../lib/cart"
import { useLocation, useNavigate } from "react-router-dom"

function normalizeItem(raw) {
  const it = raw || {}
  const title = it.title ? String(it.title) : ""

  return {
    id: it.id ?? null,
    title: title.replace(/e-?magazine/gi, "Magazine"),
    description: it.description || "",
    imageUrl: it.imageUrl || it.image_url || "",
    category: it.category || "misc",

    // required for checkout
    priceId: it.priceId || it.stripe_price_id || it.stripePriceId || "",

    // optional for UI
    unitAmount: Number(it.unitAmount ?? it.unit_amount ?? it.price_cents ?? NaN), // cents
    currency: (it.currency || "eur").toLowerCase(),

    isActive: typeof it.isActive === "boolean" ? it.isActive : true,
  }
}

export default function Store() {
  const [items, setItems] = useState([])
  const [cart, setCart] = useState(getCart())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [notice, setNotice] = useState("")
  const [qtyPick, setQtyPick] = useState({}) // { [priceId]: number }

  const location = useLocation()
  const navigate = useNavigate()

  // handle Stripe redirect (success/cancel)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const success = params.get("success")
    const canceled = params.get("canceled")

    if (success === "true") {
      clearCart()
      setCart([])
      setNotice("✅ Order successful! Thank you for your purchase.")
      document.body.classList.remove("cart-open")
      navigate("/store", { replace: true })
    } else if (canceled === "true") {
      setNotice("❌ Payment canceled.")
      navigate("/store", { replace: true })
    }
  }, [location.search, navigate])

  // load store items
  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        setLoading(true)
        setErr("")
        const res = await api.get("/store/items")
        if (!alive) return

        const arr = Array.isArray(res.data) ? res.data : []
        const normalized = arr
          .map(normalizeItem)
          .filter((x) => x.isActive && x.priceId)

        setItems(normalized)

        // init qty picker defaults
        const next = {}
        for (const it of normalized) next[it.priceId] = 1
        setQtyPick(next)
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

  const cartTotalCents = useMemo(() => {
    return cart.reduce((sum, c) => {
      const unit = Number(c.unitAmount)
      const qty = Number(c.qty) || 0
      if (!Number.isFinite(unit)) return sum
      return sum + unit * qty
    }, 0)
  }, [cart])

  const currency = useMemo(() => {
    const c = cart.find((x) => x.currency)?.currency
    return c || "eur"
  }, [cart])

  const openCart = () => document.body.classList.add("cart-open")
  const closeCart = () => document.body.classList.remove("cart-open")
  const toggleCart = () => document.body.classList.toggle("cart-open")

  const changePick = (priceId, next) => {
    const n = Math.max(1, Math.min(99, Number(next) || 1))
    setQtyPick((p) => ({ ...p, [priceId]: n }))
  }

  const addItem = (it) => {
    if (!it?.priceId) return alert("Missing Stripe priceId for this item.")

    const qty = qtyPick[it.priceId] || 1

    const next = addToCart(
      {
        priceId: it.priceId,
        title: it.title,
        imageUrl: it.imageUrl,
        unitAmount: Number.isFinite(it.unitAmount) ? it.unitAmount : null,
        currency: it.currency || "eur",
      },
      qty
    )

    setCart(next)
    openCart()
  }

  const startCheckout = async () => {
    try {
      if (!cart?.length) return

      const payloadItems = cart.map((c) => ({
        priceId: c.priceId,
        qty: Number(c.qty) || 1,
      }))

      const res = await api.post("/store/checkout", {
        items: payloadItems,
        successPath: "/store?success=true",
        cancelPath: "/store?canceled=true",
      })

      if (res?.data?.url) {
        window.location.href = res.data.url
        return
      }

      alert("Checkout failed: missing url.")
    } catch (e) {
      const msg = e?.response?.data?.details || e?.response?.data?.error || "Checkout failed."
      alert(msg)
      console.error("Checkout error:", e?.response?.data || e)
    }
  }

  return (
    <div className="page">
      <div className="store-head">
        <div>
          <h2 className="headline">Store</h2>
          <p className="subhead">Magazine & clothing — powered by Stripe.</p>

          {!!notice && <p className="msg">{notice}</p>}
          {!loading && err && <p className="msg warning">{err}</p>}
          {!loading && !err && items.length === 0 && <p className="msg">No items yet. Add one in DB.</p>}
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
            <div key={it.id || it.priceId} className="store-card">
              {it.imageUrl ? (
                <img className="store-img" src={it.imageUrl} alt={it.title} loading="lazy" />
              ) : (
                <div className="store-img store-img--ph">MIREN</div>
              )}

              <div className="store-body">
                <div className="store-title">{it.title}</div>

                {Number.isFinite(it.unitAmount) && (
                  <div className="text-muted" style={{ marginTop: 6 }}>
                    {formatMoneyCents(it.unitAmount, it.currency)}
                  </div>
                )}

                {it.description && <div className="store-desc">{it.description}</div>}

                {/* qty picker */}
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
                  <div className="qty">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => changePick(it.priceId, (qtyPick[it.priceId] || 1) - 1)}
                    >
                      −
                    </button>
                    <div className="qty-val">{qtyPick[it.priceId] || 1}</div>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => changePick(it.priceId, (qtyPick[it.priceId] || 1) + 1)}
                    >
                      +
                    </button>
                  </div>

                  <button className="btn primary store-btn" onClick={() => addItem(it)} type="button">
                    Add
                  </button>
                </div>
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
                const unitOk = Number.isFinite(Number(c.unitAmount))
                const unit = Number(c.unitAmount)
                const qty = Number(c.qty) || 1
                const rowTotal = unitOk ? unit * qty : null

                return (
                  <div key={c.priceId} className="cart-row">
                    <div className="cart-left">
                      {c.imageUrl ? (
                        <img className="cart-thumb" src={c.imageUrl} alt={c.title || "Item"} />
                      ) : (
                        <div className="cart-thumb cart-thumb--ph">M</div>
                      )}

                      <div className="cart-meta">
                        <div className="cart-name">{c.title || "Item"}</div>

                        {unitOk && (
                          <div className="text-muted" style={{ fontSize: 13 }}>
                            {formatMoneyCents(unit, c.currency)} / pc
                            {rowTotal != null ? ` • ${formatMoneyCents(rowTotal, c.currency)}` : ""}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="cart-right">
                      <div className="qty">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => {
                            const next = decQty(c.priceId, 1)
                            setCart(next)
                          }}
                        >
                          −
                        </button>

                        <div className="qty-val">{qty}</div>

                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => {
                            const next = incQty(c.priceId, 1)
                            setCart(next)
                          }}
                        >
                          +
                        </button>
                      </div>

                      <button
                        className="cart-remove"
                        onClick={() => {
                          const next = removeFromCart(c.priceId)
                          setCart(next)
                        }}
                        type="button"
                      >
                        remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* total */}
            {cartTotalCents > 0 && (
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
                <strong>Total</strong>
                <strong>{formatMoneyCents(cartTotalCents, currency)}</strong>
              </div>
            )}

            <button className="btn primary cart-checkout" onClick={startCheckout} type="button">
              Checkout with Stripe ⚡
            </button>

            <button
              className="btn ghost"
              style={{ marginTop: 10, width: "100%" }}
              onClick={() => {
                clearCart()
                setCart([])
                document.body.classList.remove("cart-open")
              }}
              type="button"
            >
              Clear cart
            </button>
          </>
        )}
      </div>

      <div className="cart-backdrop" onClick={closeCart} />
    </div>
  )
}
