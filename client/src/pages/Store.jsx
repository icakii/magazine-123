import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { api } from "../lib/api"
import Loader from "../components/Loader"
import {
  addToCart,
  getCart,
  removeFromCart,
  clearCart,
  incQty,
  decQty,
  cartTotal,
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
    priceId:
      it.priceId ||
      it.stripe_price_id ||
      it.stripePriceId ||
      it.stripe_price_id ||
      "",
    isActive: typeof it.isActive === "boolean" ? it.isActive : true,
    releaseAt: it.releaseAt || it.release_at || null,
    unitAmount: typeof it.unitAmount === "number" ? it.unitAmount : null,
    currency: it.currency ? String(it.currency).toUpperCase() : "EUR",
  }
}

function formatCountdown(ms) {
  if (ms <= 0) return null
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function Store() {
  const [items, setItems] = useState([])
  const [cart, setCartState] = useState(getCart())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [notice, setNotice] = useState("")
  const [stock, setStock] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  const location = useLocation()
  const navigate = useNavigate()

  const openCart = () => document.body.classList.add("cart-open")
  const closeCart = () => document.body.classList.remove("cart-open")
  const toggleCart = () => document.body.classList.toggle("cart-open")

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeCart()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    return () => {
      document.body.classList.remove("cart-open")
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

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
    }

    if (canceled === "true") {
      setNotice("❌ Payment canceled.")
      navigate("/store", { replace: true })
    }
  }, [location.search, navigate])

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

        const stockRes = await api.get("/magazine/stock").catch(() => null)
        if (stockRes?.data) setStock(stockRes.data)
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

  const addItem = (it) => {
    if (!it?.priceId) return alert("Missing Stripe priceId for this item.")

    // ✅ store price info inside cart item so totals work even w/out items list
    const next = addToCart(
      {
        priceId: it.priceId,
        title: it.title,
        imageUrl: it.imageUrl,
        unitAmount: it.unitAmount ?? null,
        currency: it.currency ?? "EUR",
      },
      1
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

  return (
    <div className="page">
      <div className="store-shipping-notice">
        <span className="store-shipping-notice__icon">📦</span>
        <span>Поръчките от днешния ден ще бъдат изпратени на <strong>5 май</strong> поради забавяне с печатницата. Благодарим за разбирането!</span>
      </div>

      <div className="store-head">
        <div>
          <h2 className="headline">Store</h2>
          <p className="subhead">Magazine & clothing — powered by Stripe.</p>

          {!!notice && <p className="msg success">{notice}</p>}
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
        <Loader />
      ) : (
        <div className="store-grid">
          {items.map((it) => {
            const isMagazine = it.category === "magazine"
            const soldOut = isMagazine && stock && stock.remaining <= 0
            const releaseMs = it.releaseAt ? new Date(it.releaseAt).getTime() - now : 0
            const notYetReleased = releaseMs > 0
            const countdown = notYetReleased ? formatCountdown(releaseMs) : null
            const blocked = soldOut || notYetReleased
            return (
            <div key={it.id || it.priceId} className={`store-card${soldOut ? " store-card--soldout" : ""}`}>
              <div className="store-img-wrap">
                {it.imageUrl ? (
                  <img className="store-img" src={it.imageUrl} alt={it.title} loading="lazy" />
                ) : (
                  <div className="store-img--ph">MIREN</div>
                )}
                {soldOut && <div className="store-soldout-badge">SOLD OUT</div>}
                {notYetReleased && !soldOut && (
                  <div className="store-countdown-badge">
                    <span className="store-countdown-label">Отваря след</span>
                    <span className="store-countdown-time">{countdown}</span>
                  </div>
                )}
              </div>

              <div className="store-body">
                <div className="store-title">{it.title}</div>
                {it.description && <div className="store-desc">{it.description}</div>}

                <div className="store-bottom">
                  <div className="store-price">
                    {it.unitAmount != null ? formatMoneyCents(it.unitAmount, it.currency) : ""}
                  </div>

                  <button
                    className={`btn ${blocked ? "outline" : "primary"} store-btn`}
                    onClick={() => !blocked && addItem(it)}
                    type="button"
                    disabled={blocked}
                    style={blocked ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                  >
                    {soldOut ? "Sold Out" : notYetReleased ? `Скоро — ${countdown}` : "Add to cart"}
                  </button>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {createPortal(
        <>
          <div
            className="cart-backdrop"
            onClick={closeCart}
            onKeyDown={(e) => e.key === "Escape" && closeCart()}
            role="presentation"
          />
          <div className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
            <div className="cart-top">
              <div className="cart-title" id="cart-drawer-title">
                Your Cart
              </div>
              <button className="cart-close" onClick={closeCart} type="button" aria-label="Close cart">
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
                      <div className="cart-left">
                        {c.imageUrl ? (
                          <img className="cart-thumb" src={c.imageUrl} alt={c.title || "Item"} />
                        ) : (
                          <div className="cart-thumb cart-thumb--ph">M</div>
                        )}

                        <div className="cart-meta">
                          <div className="cart-name">{c.title || "Item"}</div>

                          {typeof c.unitAmount === "number" && (
                            <div className="cart-sub text-muted">
                              {formatMoneyCents(c.unitAmount, c.currency || "EUR")}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="cart-right">
                        <div className="qty">
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => setCartState(decQty(c.priceId))}
                          >
                            −
                          </button>
                          <div className="qty-val">{Number(c.qty) || 1}</div>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => setCartState(incQty(c.priceId))}
                          >
                            +
                          </button>
                        </div>

                        <button
                          className="cart-remove"
                          onClick={() => setCartState(removeFromCart(c.priceId))}
                          type="button"
                        >
                          remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-footer">
                  <div className="cart-total">
                    <span className="text-muted">Total</span>
                    <b>{totalCents ? formatMoneyCents(totalCents, "EUR") : "—"}</b>
                  </div>

                  <button className="btn primary cart-checkout" onClick={startCheckout} type="button">
                    Checkout with Stripe ⚡
                  </button>

                  <button
                    className="btn ghost"
                    onClick={() => {
                      clearCart()
                      setCartState([])
                    }}
                    type="button"
                  >
                    Clear cart
                  </button>
                </div>
              </>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
