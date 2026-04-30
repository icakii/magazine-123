// server/src/routes/store.js
const express = require("express")
const router = express.Router()
const db = require("../db")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const authMiddleware = require("../middleware/auth.middleware")

const APP_URL = (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, "")
const { isAdmin } = require("../lib/admins")

function toAbsoluteUrl(pathOrUrl, base) {
  // allows "/store?x=1" OR already absolute "https://..."
  try {
    return new URL(pathOrUrl, base).toString()
  } catch {
    return new URL("/", base).toString()
  }
}

// ----------------------------------------------------
// PUBLIC: list active store items
// GET /api/store/items
// ----------------------------------------------------
// PUBLIC: list active store items
// GET /api/store/items
router.get("/store/items", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id,
              title,
              description,
              image_url AS "imageUrl",
              category,
              stripe_price_id AS "priceId",
              is_active AS "isActive",
              release_at AS "releaseAt",
              quantity
       FROM store_items
       WHERE is_active = true
       ORDER BY created_at DESC`
    )

    // ✅ attach Stripe price info so frontend can show price + totals
    const mapped = await Promise.all(
      rows.map(async (r) => {
        let unitAmount = null
        let currency = "EUR"
        try {
          const p = await stripe.prices.retrieve(String(r.priceId))
          unitAmount = typeof p?.unit_amount === "number" ? p.unit_amount : null
          currency = p?.currency ? String(p.currency).toUpperCase() : "EUR"
        } catch {
          unitAmount = null
          currency = "EUR"
        }

        return {
          ...r,
          unitAmount,
          currency,
        }
      })
    )

    res.json(mapped)
  } catch (e) {
    console.error("STORE ITEMS ERROR:", e)
    res.status(500).json({ error: "Failed to load store items" })
  }
})

// ----------------------------------------------------
// ADMIN CRUD (protected)
// base: /api/admin/store/...
// ----------------------------------------------------
router.post("/admin/store/items", authMiddleware, async (req, res) => {
  try {
    const email = req.user?.email
    if (!email) return res.status(401).json({ error: "Unauthorized" })
    if (!await isAdmin(email)) return res.status(403).json({ error: "Admin access required" })

    const { title, description, imageUrl, category, priceId, isActive, releaseAt, quantity } = req.body || {}
    if (!title || !priceId) return res.status(400).json({ error: "title and priceId required" })

    const { rows } = await db.query(
      `INSERT INTO store_items (title, description, image_url, category, stripe_price_id, is_active, release_at, quantity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id,
                 title,
                 description,
                 image_url AS "imageUrl",
                 category,
                 stripe_price_id AS "priceId",
                 is_active AS "isActive",
                 release_at AS "releaseAt",
                 quantity`,
      [
        title,
        description || "",
        imageUrl || "",
        category || "magazine",
        priceId,
        isActive !== false,
        releaseAt || null,
        quantity != null ? Number(quantity) : null,
      ]
    )

    res.json({ ok: true, item: rows[0] })
  } catch (e) {
    console.error("ADMIN CREATE STORE ITEM ERROR:", e)
    res.status(500).json({ error: "Failed to create item" })
  }
})

router.put("/admin/store/items/:id", authMiddleware, async (req, res) => {
  try {
    const email = req.user?.email
    if (!email) return res.status(401).json({ error: "Unauthorized" })
    if (!await isAdmin(email)) return res.status(403).json({ error: "Admin access required" })

    const id = Number(req.params.id)
    const { title, description, imageUrl, category, priceId, isActive, releaseAt, quantity } = req.body || {}
    if (!id) return res.status(400).json({ error: "Invalid id" })

    await db.query(
      `UPDATE store_items
       SET title=$1,
           description=$2,
           image_url=$3,
           category=$4,
           stripe_price_id=$5,
           is_active=$6,
           release_at=$7,
           quantity=$8
       WHERE id=$9`,
      [
        title,
        description || "",
        imageUrl || "",
        category || "magazine",
        priceId,
        isActive !== false,
        releaseAt || null,
        quantity != null ? Number(quantity) : null,
        id,
      ]
    )

    res.json({ ok: true })
  } catch (e) {
    console.error("ADMIN UPDATE STORE ITEM ERROR:", e)
    res.status(500).json({ error: "Failed to update item" })
  }
})

router.delete("/admin/store/items/:id", authMiddleware, async (req, res) => {
  try {
    const email = req.user?.email
    if (!email) return res.status(401).json({ error: "Unauthorized" })
    if (!await isAdmin(email)) return res.status(403).json({ error: "Admin access required" })

    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: "Invalid id" })

    await db.query("DELETE FROM store_items WHERE id=$1", [id])
    res.json({ ok: true })
  } catch (e) {
    console.error("ADMIN DELETE STORE ITEM ERROR:", e)
    res.status(500).json({ error: "Failed to delete item" })
  }
})

// ----------------------------------------------------
// CHECKOUT (public): create Stripe Checkout session
// POST /api/store/checkout
// body: { items:[{priceId, qty}], successPath, cancelPath }
// ----------------------------------------------------
router.post("/store/checkout", async (req, res) => {
  try {
    const { items, successPath, cancelPath } = req.body || {}
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" })
    }

    // validate from DB (only active)
    const priceIds = items.map((x) => String(x.priceId || "")).filter(Boolean)
    if (priceIds.length === 0) return res.status(400).json({ error: "Invalid cart" })

    const { rows } = await db.query(
      `SELECT stripe_price_id AS "priceId", is_active AS "isActive"
       FROM store_items
       WHERE stripe_price_id = ANY($1::text[])`,
      [priceIds]
    )

    const valid = new Set(rows.filter((r) => r.isActive === true).map((r) => r.priceId))
    const line_items = []

    for (const it of items) {
      const priceId = String(it.priceId || "")
      if (!valid.has(priceId)) continue
      const qty = Math.max(1, Math.min(10, Number(it.qty || 1)))
      line_items.push({ price: priceId, quantity: qty })
    }

    if (line_items.length === 0) {
      return res.status(400).json({ error: "No valid items" })
    }

    // ✅ We want to ALWAYS land back on /store to clear cart and show message
    const successUrl = toAbsoluteUrl(successPath || "/store?success=true", APP_URL)
    const cancelUrl = toAbsoluteUrl(cancelPath || "/store?canceled=true", APP_URL)

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,

      success_url: successUrl,
      cancel_url: cancelUrl,

      phone_number_collection: { enabled: true },

      shipping_address_collection: {
        allowed_countries: ["BG", "GB", "DE", "FR", "NL", "AT", "BE", "GR", "RO", "US"],
      },

      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 249, currency: "eur" },
            display_name: "Econt — До автомат (Econt Box)",
            metadata: { courier: "econt", delivery_type: "locker" },
            delivery_estimate: { minimum: { unit: "business_day", value: 1 }, maximum: { unit: "business_day", value: 2 } },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 499, currency: "eur" },
            display_name: "Econt — До адрес",
            metadata: { courier: "econt", delivery_type: "courier" },
            delivery_estimate: { minimum: { unit: "business_day", value: 1 }, maximum: { unit: "business_day", value: 3 } },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 249, currency: "eur" },
            display_name: "Speedy — До автомат (Speedy Box)",
            metadata: { courier: "speedy", delivery_type: "locker" },
            delivery_estimate: { minimum: { unit: "business_day", value: 1 }, maximum: { unit: "business_day", value: 2 } },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 499, currency: "eur" },
            display_name: "Speedy — До адрес",
            metadata: { courier: "speedy", delivery_type: "courier" },
            delivery_estimate: { minimum: { unit: "business_day", value: 1 }, maximum: { unit: "business_day", value: 3 } },
          },
        },
      ],

      custom_fields: [
        {
          key: "full_name",
          label: { type: "custom", custom: "Three names (Три имена)" },
          type: "text",
          text: { minimum_length: 5, maximum_length: 80 },
          optional: false,
        },
      ],

      metadata: {
        source: "miren_store",
      },
    })

    return res.json({ url: session.url })
  } catch (e) {
    console.error("STORE CHECKOUT ERROR:", e?.message || e, e)
    return res.status(500).json({
      error: "Failed to start checkout",
      details: e?.message || "Unknown error",
    })
  }
})

// ----------------------------------------------------
// ADMIN: list paid orders from Stripe (no DB)
// GET /api/admin/store/orders
// ----------------------------------------------------
router.get("/admin/store/orders", authMiddleware, async (req, res) => {
  try {
    const email = req.user?.email
    if (!email) return res.status(401).json({ error: "Unauthorized" })
    if (!await isAdmin(email)) return res.status(403).json({ error: "Admin access required" })

    const sessions = await stripe.checkout.sessions.list({ limit: 50 })

    const paid = (sessions.data || []).filter(
      (s) => s.mode === "payment" && s.payment_status === "paid"
    )

    const mapped = await Promise.all(
      paid.map(async (s) => {
        let lineItems = []
        try {
          const li = await stripe.checkout.sessions.listLineItems(s.id, { limit: 100 })
          lineItems = (li.data || []).map((x) => ({
            description: x.description,
            quantity: x.quantity,
            amount_total: x.amount_total,
            currency: x.currency,
          }))
        } catch {
          lineItems = []
        }

        const shipping = s.shipping_details || null
        const customer = s.customer_details || null

        const customFields = Array.isArray(s.custom_fields) ? s.custom_fields : []
        const fullNameField = customFields.find((f) => f?.key === "full_name")
        const fullName = fullNameField?.text?.value || ""

        let courier = ""
        let deliveryType = ""
        try {
          if (s.shipping_cost?.shipping_rate) {
            const rate = await stripe.shippingRates.retrieve(s.shipping_cost.shipping_rate)
            courier = rate.metadata?.courier || ""
            deliveryType = rate.metadata?.delivery_type || ""
          }
        } catch {}

        return {
          id: s.id,
          created: s.created,
          amount_total: s.amount_total,
          currency: s.currency,
          customer_email: customer?.email || "",
          customer_phone: customer?.phone || "",
          full_name: fullName,
          shipping_name: shipping?.name || "",
          shipping_address: shipping?.address || null,
          courier,
          delivery_type: deliveryType,
          line_items: lineItems,
        }
      })
    )

    res.json(mapped)
  } catch (e) {
    console.error("ADMIN ORDERS ERROR:", e)
    res.status(500).json({ error: "Failed to load orders" })
  }
})

module.exports = router
