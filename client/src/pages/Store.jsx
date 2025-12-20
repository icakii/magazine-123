import { useEffect, useMemo, useState } from "react"
import { api } from "../lib/api"
import { addToCart, getCart, removeFromCart, clearCart } from "../lib/cart"
import { useLocation, useNavigate } from "react-router-dom"

function normalizeItem(raw) {
  const it = raw || {}
  const title = it.title ? String(it.title) : ""
  const cleanTitle = title.replace(/e-?magazine/gi, "Magazine").trim()

  const desc = (it.description || "").trim()

  return {
    id: it.id ?? null,
    title: cleanTitle,
    description: desc,
    imageUrl: it.imageUrl || it.image_url || "",
    category: it.category || "misc",
    priceId:
      it.priceId ||
      it.stripe_price_id ||
      it.stripePriceId ||
      it.stripe_price_id ||
      "",
    isActive: typeof it.isActive === "boolean" ? it.isActive : true,
  }
}

export default function Store() {
  const [items, setItems] = useState([])
  const [cart, setCart] = useState(getCart())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [notice, setNotice] = useState("")

  const location = useLocation()
  const navigate = useNavigate()

  // ✅ success/canceled handling (clears cart + cleans URL)
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
      return
    }

    if (canceled === "true") {
      setNotice("❌ Payment canceled.")
      document.body.classList.remove("cart-open")
      navigate("/store", { replace: true })
    }
  }, [location.search, navigate])

  // ✅ load store items
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

  const addItem = (it) => {
    if (!it?.priceId) return alert("Missing Stripe priceId for this item.")
    const next = addToCart(
      { priceId: it.priceId, title: it.title, imageUrl: it.imageUrl },
      1
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
      <div className="store-head">
        <div>
          <h2 className="headline">Store</h2>
          <p className="subhead">Magazine & clothing — powered by Stripe.</p>

          {!!notice && <p className="msg">{notice}</p>}
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
            const showDesc =
              it.description &&
              it.description.toLowerCase() !== it.title.toLowerCase()

            return (
              <div key={it.id || it.priceId} className="store-card">
                {it.imageUrl ? (
                  <img
                    className="store-img"
                    src={it.imageUrl}
                    alt={it.title}
                    loading="lazy"
                  />
                ) : (
                  <div className="store-img store-img--ph">MIREN</div>
                )}

                <div className="store-body">
                  <div className="store-title">{it.title}</div>
                  {showDesc && <div className="store-desc">{it.description}</div>}

                  <button
                    className="btn primary store-btn"
                    onClick={() => addItem(it)}
                    type="button"
                  >
                    Add to cart
                  </button>
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
                  <div className="cart-left">
                    {c.imageUrl ? (
                      <img
                        className="cart-thumb"
                        src={c.imageUrl}
                        alt={c.title || "Item"}
                      />
                    ) : (
                      <div className="cart-thumb cart-thumb--ph">M</div>
                    )}
                    <div className="cart-meta">
                      <div className="cart-name">{c.title || "Item"}</div>
                      {/* ✅ removed priceId line */}
                    </div>
                  </div>

                  <div className="cart-right">
                    <div className="cart-qty">x{c.qty}</div>
                    <button
                      className="cart-remove"
                      onClick={() => setCart(removeFromCart(c.priceId))}
                      type="button"
                    >
                      remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="store-controls" style={{ marginTop: 12 }}>

            <button
              className="btn primary cart-checkout"
              onClick={startCheckout}
              type="button"
            >
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
            </div>
          </>
        )}
      </div>

      <div className="cart-backdrop" onClick={closeCart} />
    </div>
  )
}
