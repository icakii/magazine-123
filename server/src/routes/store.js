// server/src/routes/store.js
const express = require("express")
const router = express.Router()
const db = require("../db")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const authMiddleware = require("../middleware/auth.middleware")

const APP_URL = (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, "")

const ADMIN_EMAILS = [
  "icaki06@gmail.com",
  "icaki2k@gmail.com",
  "mirenmagazine@gmail.com",
]

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email)
}

function toAbsoluteUrl(pathOrUrl, base) {
  // allows "/profile?x=1" OR already absolute "https://..."
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
              release_at AS "releaseAt"
       FROM store_items
       WHERE is_active = true
       ORDER BY created_at DESC`
    )
    res.json(rows)
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
    if (!isAdmin(email)) return res.status(403).json({ error: "Admin access required" })

    const { title, description, imageUrl, category, priceId, isActive, releaseAt } = req.body || {}
    if (!title || !priceId) return res.status(400).json({ error: "title and priceId required" })

    const { rows } = await db.query(
      `INSERT INTO store_items (title, description, image_url, category, stripe_price_id, is_active, release_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id,
                 title,
                 description,
                 image_url AS "imageUrl",
                 category,
                 stripe_price_id AS "priceId",
                 is_active AS "isActive",
                 release_at AS "releaseAt"`,
      [
        title,
        description || "",
        imageUrl || "",
        category || "magazine",
        priceId,
        isActive !== false,
        releaseAt || null,
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
    if (!isAdmin(email)) return res.status(403).json({ error: "Admin access required" })

    const id = Number(req.params.id)
    const { title, description, imageUrl, category, priceId, isActive, releaseAt } = req.body || {}
    if (!id) return res.status(400).json({ error: "Invalid id" })

    await db.query(
      `UPDATE store_items
       SET title=$1,
           description=$2,
           image_url=$3,
           category=$4,
           stripe_price_id=$5,
           is_active=$6,
           release_at=$7
       WHERE id=$8`,
      [
        title,
        description || "",
        imageUrl || "",
        category || "magazine",
        priceId,
        isActive !== false,
        releaseAt || null,
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
    if (!isAdmin(email)) return res.status(403).json({ error: "Admin access required" })

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

    const successUrl = toAbsoluteUrl(successPath || "/profile?order_success=true", APP_URL)
    const cancelUrl = toAbsoluteUrl(cancelPath || "/store?canceled=true", APP_URL)

    // ✅ Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,

      success_url: successUrl,
      cancel_url: cancelUrl,

      // ✅ Collect phone
      phone_number_collection: { enabled: true },

      // ✅ Collect address (shipping)
      shipping_address_collection: {
        allowed_countries: ["BG"],
      },

      // ✅ “Tri imena”
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
    // ✅ show real Stripe error (this will instantly tell us what is wrong)
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
    if (!isAdmin(email)) return res.status(403).json({ error: "Admin access required" })

    // last 50 sessions (paid)
    const sessions = await stripe.checkout.sessions.list({
      limit: 50,
    })

    // keep only paid "payment" sessions
    const paid = (sessions.data || []).filter(
      (s) => s.mode === "payment" && s.payment_status === "paid"
    )

    // fetch line items for each (Stripe API call per session)
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

        // custom_fields contains your “three names”
        const customFields = Array.isArray(s.custom_fields) ? s.custom_fields : []
        const fullNameField = customFields.find((f) => f?.key === "full_name")
        const fullName = fullNameField?.text?.value || ""

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
