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
  cartTotal,
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
    priceId:
      it.priceId ||
      it.stripe_price_id ||
      it.stripePriceId ||
      it.stripe_price_id ||
      "",
    isActive: typeof it.isActive === "boolean" ? it.isActive : true,

    // ✅ price info (from backend)
    unitAmount: typeof it.unitAmount === "number" ? it.unitAmount : null, // cents
    currency: it.currency ? String(it.currency).toUpperCase() : "EUR",
  }
}

export default function Store() {
  const [items, setItems] = useState([])
  const [cart, setCartState] = useState(getCart())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [notice, setNotice] = useState("")
  const [qtyByPriceId, setQtyByPriceId] = useState({})

  const location = useLocation()
  const navigate = useNavigate()

  // ✅ Stripe redirect handling
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const success = params.get("success")
    const canceled = params.get("canceled")

    if (success === "true") {
      clearCart()
      setCartState([])
      setNotice("✅ Order successful! Thank you for your purchase.")
      document.body.classList.remove("cart-open")
      navigate("/store", { replace: true })
      return
    }

    if (canceled === "true") {
      setNotice("❌ Payment canceled.")
      navigate("/store", { replace: true })
    }
  }, [location.search, navigate])

  // ✅ Load items
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

        // init qty selectors to 1
        const init = {}
        for (const it of normalized) init[it.priceId] = 1
        setQtyByPriceId(init)
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

  const totalCents = useMemo(() => cartTotal(cart), [cart])
  const currency = useMemo(() => (cart?.[0]?.currency || "EUR").toUpperCase(), [cart])

  const openCart = () => document.body.classList.add("cart-open")
  const closeCart = () => document.body.classList.remove("cart-open")
  const toggleCart = () => document.body.classList.toggle("cart-open")

  const setCardQty = (priceId, next) => {
    setQtyByPriceId((prev) => ({
      ...prev,
      [priceId]: Math.max(1, Math.min(50, Number(next) || 1)),
    }))
  }

  const addItem = (it) => {
    if (!it?.priceId) return alert("Missing Stripe priceId for this item.")

    const qty = Math.max(1, Math.min(50, Number(qtyByPriceId[it.priceId]) || 1))

    const next = addToCart(
      {
        priceId: it.priceId,
        title: it.title,
        imageUrl: it.imageUrl,
        unitAmount: it.unitAmount,
        currency: it.currency,
      },
      qty
    )
    setCartState(next)
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
      const msg =
        e?.response?.data?.details ||
        e?.response?.data?.error ||
        "Checkout failed."
      alert(msg)
      console.error("Checkout error:", e?.response?.data || e)
    }
  }

  const updateCartQty = (priceId, nextQty) => {
    const next = setQty(priceId, nextQty)
    setCartState(next)
  }

  const cartInc = (priceId) => {
    const next = incQty(priceId)
    setCartState(next)
  }

  const cartDec = (priceId) => {
    const next = decQty(priceId)
    setCartState(next)
  }

  return (
    <div className="page">
      <div className="store-head">
        <div>
          <h2 className="headline">Store</h2>
          <p className="subhead">Magazine & clothing — powered by Stripe.</p>

          {notice && <p className="msg">{notice}</p>}
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
          {items.map((it) => {
            const shownPrice = it.unitAmount != null ? formatMoneyCents(it.unitAmount, it.currency) : ""

            return (
              <div key={it.id || it.priceId} className="store-card">
                {it.imageUrl ? (
                  <img
                    className="store-img"
                    src={it.imageUrl}
                    alt="" // ✅ prevents "double title" when image fails
                    loading="lazy"
                    onError={(e) => {
                      // hide broken image to avoid ugly icon + text
                      e.currentTarget.style.display = "none"
                    }}
                  />
                ) : (
                  <div className="store-img store-img--ph">MIREN</div>
                )}

                <div className="store-body">
                  <div className="store-title">{it.title}</div>
                  {it.description && <div className="store-desc">{it.description}</div>}

                  {/* ✅ price */}
                  {shownPrice && <div className="store-price">{shownPrice}</div>}

                  {/* ✅ bottom row aligned for ALL cards */}
                  <div className="store-bottom">
                    <div className="qty">
                      <button
                        className="qty-btn"
                        type="button"
                        onClick={() => setCardQty(it.priceId, (qtyByPriceId[it.priceId] || 1) - 1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>

                      <input
                        className="qty-input"
                        value={qtyByPriceId[it.priceId] || 1}
                        onChange={(e) => setCardQty(it.priceId, e.target.value)}
                        inputMode="numeric"
                        aria-label="Quantity"
                      />

                      <button
                        className="qty-btn"
                        type="button"
                        onClick={() => setCardQty(it.priceId, (qtyByPriceId[it.priceId] || 1) + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="btn primary store-btn"
                      onClick={() => addItem(it)}
                      type="button"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CART DRAWER */}
      <div className="cart-drawer cart-drawer--sticky">
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
                const unit = c.unitAmount
                const lineTotal =
                  Number.isFinite(Number(unit)) ? Number(unit) * (Number(c.qty) || 1) : null

                return (
                  <div key={c.priceId} className="cart-row">
                    <div className="cart-left">
                      {c.imageUrl ? (
                        <img
                          className="cart-thumb"
                          src={c.imageUrl}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      ) : (
                        <div className="cart-thumb cart-thumb--ph">M</div>
                      )}

                      <div className="cart-meta">
                        <div className="cart-name">{c.title || "Item"}</div>

                        {/* ✅ show price instead of priceId */}
                        {Number.isFinite(Number(unit)) && (
                          <div className="cart-sub text-muted">
                            {formatMoneyCents(unit, c.currency)}
                            {lineTotal != null && (
                              <span style={{ marginLeft: 10 }}>
                                • {formatMoneyCents(lineTotal, c.currency)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="cart-right">
                      {/* ✅ qty controls in cart */}
                      <div className="qty qty--sm">
                        <button className="qty-btn" type="button" onClick={() => cartDec(c.priceId)}>
                          −
                        </button>

                        <input
                          className="qty-input"
                          value={c.qty}
                          onChange={(e) => updateCartQty(c.priceId, e.target.value)}
                          inputMode="numeric"
                        />

                        <button className="qty-btn" type="button" onClick={() => cartInc(c.priceId)}>
                          +
                        </button>
                      </div>

                      <button
                        className="cart-remove"
                        onClick={() => setCartState(removeFromCart(c.priceId))}
                        type="button"
                        title="Remove item"
                      >
                        remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ✅ totals */}
            {totalCents > 0 && (
              <div className="cart-total">
                <span>Total</span>
                <strong>{formatMoneyCents(totalCents, currency)}</strong>
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
                setCartState([])
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
