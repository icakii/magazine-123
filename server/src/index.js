// ================================================================
// SERVER/INDEX.JS - MIREN API (SECURE VERSION)
// ================================================================

require("dotenv").config()
const cron = require("node-cron")
const express = require("express")
const rateLimit = require("express-rate-limit")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer")
const crypto = require("crypto")
const dns = require("node:dns").promises
const db = require("./db")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const helmet = require("helmet")
const path = require("path")
const fs = require("fs")
const userRouter = require("./routes/user.routes")
const { OAuth2Client } = require("google-auth-library")

// ✅ ROUTERS
const storeRouter = require("./routes/store")


const leaderboardsRouter = require("./routes/leaderboards")

const app = express()
const makeUserStreakRouter = require("./routes/userStreak")

app.use(
  "/api",
  makeUserStreakRouter({
    sendGameStreakEndedEmail
  })
)
const PORT = process.env.PORT || 8080
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"
const APP_URL = process.env.APP_URL || "http://localhost:5173"
const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY || ""
const STRIPE_PRICE_YEARLY = process.env.STRIPE_PRICE_YEARLY || ""
const STRIPE_PRICE_MAGAZINE = process.env.STRIPE_PRICE_MAGAZINE || ""
const MAGAZINE_STOCK_TOTAL = 60

// ---------------------------------------------------------------
// 0) TRUST PROXY (Render)
// ---------------------------------------------------------------
app.set("trust proxy", 1)

// ---------------------------------------------------------------
// 1) CORS — APPLY ONLY TO /api (НЕ глобално)
// ---------------------------------------------------------------
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  process.env.APP_URL,
  "https://magazine-123.onrender.com", // ✅ ТОВА Е НОВИЯТ ТИ ДОМЕЙН
  "http://localhost:5173",
  "http://localhost:8080",
].filter(Boolean)

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    return cb(null, false)
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}

// ✅ CORS само за API:
app.use("/api", cors(corsOptions))
app.options("/api/*", cors(corsOptions))

const heroRoutes = require("./routes/hero")

app.use(cookieParser())
// ---------------------------------------------------------------
// 2) SECURITY + COOKIES
// ---------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "img-src": ["'self'", "data:", "blob:", "https:"],
        "media-src": ["'self'", "data:", "blob:", "https:"],
        "script-src": ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        "frame-src": ["'self'", "https://accounts.google.com"],
        "connect-src": ["'self'", "https://accounts.google.com", "https://www.googleapis.com"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
)

// ---------------------------------------------------------------
// 7) EMAIL TRANSPORTERS
// ---------------------------------------------------------------
const EMAIL_ACCOUNTS = {
  fallback: {
    user: "icaki@mirenmagazine.com",
    pass: "cxmo zntl ajeo cvyc",
    label: "MIREN",
  },
  login: {
    user: "support@mirenmagazine.com",
    pass: "ezcp bccr lsed vthu",
    label: "MIREN",
  },
  contact: {
    user: "contact@mirenmagazine.com",
    pass: "ovyo iwhi vjhu scji",
    label: "MIREN Contact",
  },
  newsletter: {
    user: "info@mirenmagazine.com",
    pass: "uywk zcdo ymhe gjdb",
    label: "MIREN Newsletter",
  },
}

const SITE_URL = (process.env.APP_URL || "https://mirenmagazine.com").replace(/\/$/, "")

function buildOrderConfirmationEmail({ fullName, customerEmail, items, total, currency, addr, courierDisplay }) {
  const itemRows = (items || []).map(it =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0ede8;font-size:15px;color:#1e1e1e;">${it.description}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0ede8;font-size:15px;color:#1e1e1e;text-align:right;">x${it.quantity}</td>
    </tr>`
  ).join("")

  return `<!DOCTYPE html>
<html lang="bg">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f3ee;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#9c2a2a;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
            <a href="${SITE_URL}" style="text-decoration:none;">
              <div style="font-family:Georgia,serif;font-size:32px;font-weight:900;color:#fff;letter-spacing:0.18em;text-transform:uppercase;">MIREN</div>
              <div style="color:rgba(255,255,255,0.65);font-size:12px;letter-spacing:0.25em;text-transform:uppercase;margin-top:4px;">Magazine</div>
            </a>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:40px 40px 32px;">
            <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#1e1e1e;">Благодарим за поръчката! 🎉</h1>
            <p style="margin:0 0 28px;font-size:16px;color:#555;line-height:1.6;">
              Здравей ${fullName ? `<strong>${fullName}</strong>` : ""},<br>
              получихме твоята поръчка и я обработваме. Ще получиш отделен имейл с номер за проследяване веднага след като изпратим пратката.
            </p>

            <!-- Items -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td colspan="2" style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9c2a2a;padding-bottom:8px;border-bottom:2px solid #9c2a2a;">
                  Поръчани продукти
                </td>
              </tr>
              ${itemRows}
              <tr>
                <td style="padding-top:12px;font-size:16px;font-weight:700;color:#1e1e1e;">Общо</td>
                <td style="padding-top:12px;font-size:18px;font-weight:900;color:#9c2a2a;text-align:right;">${total} ${currency}</td>
              </tr>
            </table>

            <!-- Delivery -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;border-radius:10px;padding:20px 24px;margin-bottom:32px;">
              <tr>
                <td style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9c2a2a;padding-bottom:12px;">Адрес за доставка</td>
              </tr>
              <tr>
                <td style="font-size:15px;color:#1e1e1e;line-height:1.7;">
                  ${fullName || ""}<br>
                  ${addr.line1 || ""}${addr.line2 ? ", " + addr.line2 : ""}<br>
                  ${addr.postal_code || ""} ${addr.city || ""}, ${addr.country || ""}
                  ${courierDisplay ? `<br><span style="color:#555;font-size:13px;">Куриер: ${courierDisplay}</span>` : ""}
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <div style="text-align:center;">
              <a href="${SITE_URL}" style="display:inline-block;background:#9c2a2a;color:#fff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.06em;padding:14px 36px;border-radius:999px;">
                Посети MIREN →
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#1e1e1e;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6;">
              МИРЕН МАГ ЕООД • <a href="${SITE_URL}" style="color:rgba(255,255,255,0.55);text-decoration:none;">mirenmagazine.com</a><br>
              Получаваш този имейл защото направи поръчка на нашия сайт.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildTrackingEmail({ fullName, trackingNumber, courier, trackingUrl }) {
  const courierLabel = courier === "econt" ? "Econt" : courier === "speedy" ? "Speedy" : courier || "Куриер"

  return `<!DOCTYPE html>
<html lang="bg">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f3ee;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#9c2a2a;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
            <a href="${SITE_URL}" style="text-decoration:none;">
              <div style="font-family:Georgia,serif;font-size:32px;font-weight:900;color:#fff;letter-spacing:0.18em;text-transform:uppercase;">MIREN</div>
              <div style="color:rgba(255,255,255,0.65);font-size:12px;letter-spacing:0.25em;text-transform:uppercase;margin-top:4px;">Magazine</div>
            </a>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:40px 40px 32px;">
            <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#1e1e1e;">Пратката е на път! 📦</h1>
            <p style="margin:0 0 32px;font-size:16px;color:#555;line-height:1.6;">
              Здравей ${fullName ? `<strong>${fullName}</strong>` : ""},<br>
              изпратихме твоя брой на <strong>MIREN Magazine</strong> с <strong>${courierLabel}</strong>. Можеш да проследиш пратката с номера по-долу.
            </p>

            <!-- Tracking number box -->
            <div style="background:#f7f3ee;border:2px solid #9c2a2a;border-radius:12px;padding:28px;text-align:center;margin-bottom:32px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#9c2a2a;margin-bottom:10px;">Номер за проследяване</div>
              <div style="font-family:Georgia,serif;font-size:30px;font-weight:900;color:#1e1e1e;letter-spacing:0.08em;">${trackingNumber}</div>
              <div style="margin-top:6px;font-size:13px;color:#888;">Куриер: ${courierLabel}</div>
            </div>

            <!-- Track CTA -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${trackingUrl}" style="display:inline-block;background:#1e1e1e;color:#fff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.06em;padding:14px 36px;border-radius:999px;">
                Проследи пратката →
              </a>
            </div>

            <p style="margin:0;font-size:14px;color:#888;line-height:1.6;text-align:center;">
              Очаквай доставката в рамките на 1–3 работни дни.<br>
              При въпроси: <a href="mailto:info@mirenmagazine.com" style="color:#9c2a2a;text-decoration:none;">info@mirenmagazine.com</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#1e1e1e;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6;">
              МИРЕН МАГ ЕООД • <a href="${SITE_URL}" style="color:rgba(255,255,255,0.55);text-decoration:none;">mirenmagazine.com</a><br>
              Получаваш този имейл защото направи поръчка на нашия сайт.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function createTransportFor(account) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  })
}

const transporters = {
  fallback: createTransportFor(EMAIL_ACCOUNTS.fallback),
  login: createTransportFor(EMAIL_ACCOUNTS.login),
  contact: createTransportFor(EMAIL_ACCOUNTS.contact),
  newsletter: createTransportFor(EMAIL_ACCOUNTS.newsletter),
}

Object.entries(transporters).forEach(([key, transporter]) => {
  transporter.verify((err) => {
    if (err) console.error(`❌ EMAIL TRANSPORT VERIFY FAILED (${key}):`, err)
    else console.log(`✅ EMAIL TRANSPORT READY (${key})`)
  })
})

async function sendWithFallback({ primary = "fallback", backups = [], buildMessage }) {
  const order = [primary, ...backups].filter((key, idx, arr) => key && arr.indexOf(key) === idx)
  let lastError = null

  for (const key of order) {
    const transporter = transporters[key]
    const account = EMAIL_ACCOUNTS[key]
    if (!transporter || !account) continue

    try {
      const info = await transporter.sendMail(buildMessage(account))
      return { info, transporterKey: key }
    } catch (err) {
      lastError = err
      console.error(`❌ EMAIL SEND FAILED (${key}):`, err?.message || err)
    }
  }

  throw lastError || new Error("No mail transporters available")
}

async function sendGameStreakEndedEmail({ to, gameKey, streak }) {
  const safeGame = String(gameKey || "game").toUpperCase()

 return transporters.fallback.sendMail({
    from: `"${EMAIL_ACCOUNTS.fallback.label}" <${EMAIL_ACCOUNTS.fallback.user}>`,
    to,
    subject: `Streak ended — ${safeGame}`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#111;">
        <h2 style="margin:0 0 10px;">Your streak ended</h2>

        <p style="margin:0 0 12px;">
          Your <b>${safeGame}</b> streak has ended.
        </p>

        <div style="margin:16px 0; padding:14px 16px; border:1px solid #eee; border-radius:12px; background:#fafafa;">
          <div style="font-size:12px; color:#666; margin-bottom:6px;">Streak</div>
          <div style="font-size:26px; font-weight:900;">${Number(streak || 0)}</div>
        </div>

        <p style="margin:0 0 10px;">
          Come back tomorrow and start a new streak 💪
        </p>

        <hr style="border:none; border-top:1px solid #eee; margin:18px 0;" />

        <p style="margin:0; font-size:12px; color:#666;">
          If this wasn’t you, you can ignore this email.
        </p>
      </div>
    `,
  })
}

// ---------------------------------------------------------------
// SPEEDY WAYBILL CREATION
// ---------------------------------------------------------------
async function createSpeedyWaybill({ fullName, customerPhone, shippingAddress, deliveryType, quantity }) {
  const SPEEDY_USER = process.env.SPEEDY_USERNAME
  const SPEEDY_PASS = process.env.SPEEDY_PASSWORD
  if (!SPEEDY_USER || !SPEEDY_PASS) {
    console.log("⚠️ Speedy credentials not configured — skipping waybill creation")
    return null
  }

  const addr = shippingAddress || {}
  const city = addr.city || ""
  const street = addr.line1 || ""
  const zip = addr.postal_code || ""
  const senderName = process.env.SPEEDY_SENDER_NAME || process.env.ECONT_SENDER_NAME || "MIREN Magazine"
  const senderPhone = process.env.SPEEDY_SENDER_PHONE || process.env.ECONT_SENDER_PHONE || ""

  const body = {
    userName: SPEEDY_USER,
    password: SPEEDY_PASS,
    language: "BG",
    service: {
      serviceId: deliveryType === "locker" ? 505 : deliveryType === "office" ? 505 : 500,
      autoAdjustPickupDate: true,
    },
    sender: {
      clientName: senderName,
      phone: { number: senderPhone },
    },
    recipient: {
      privatePerson: true,
      clientName: fullName || "Customer",
      phone: { number: customerPhone || "" },
      address: {
        countryId: 100, // Bulgaria
        siteName: city,
        streetName: street,
        postCode: zip,
      },
    },
    parcel: {
      packageCount: quantity || 1,
      weight: 0.3 * (quantity || 1),
    },
    content: { contents: "Списание", package: "DOCUMENT" },
    payment: { courierServicePayer: "SENDER" },
  }

  if (deliveryType === "locker") {
    body.recipient.pickupOfficeId = parseInt(process.env.SPEEDY_DEFAULT_LOCKER_ID || "0") || undefined
    if (!body.recipient.pickupOfficeId) delete body.recipient.pickupOfficeId
  } else if (deliveryType === "office") {
    body.recipient.pickupOfficeId = parseInt(process.env.SPEEDY_DEFAULT_OFFICE_ID || "0") || undefined
    if (!body.recipient.pickupOfficeId) delete body.recipient.pickupOfficeId
  }

  const senderOfficeId = parseInt(process.env.SPEEDY_SENDER_OFFICE_ID || "0")
  if (senderOfficeId) body.sender.pickupOfficeId = senderOfficeId

  try {
    const response = await fetch("https://api.speedy.bg/v1/shipment/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    if (data.error) { console.error("SPEEDY API ERROR:", data.error); return null }
    const waybill = data.id ? String(data.id) : null
    console.log("✅ Speedy waybill created:", waybill)
    return waybill
  } catch (e) {
    console.error("SPEEDY WAYBILL ERROR:", e.message)
    return null
  }
}

// ---------------------------------------------------------------
// ECONT WAYBILL CREATION
// ---------------------------------------------------------------
async function createEcontWaybill({ fullName, customerPhone, shippingAddress, deliveryType, quantity }) {
  const ECONT_USER = process.env.ECONT_USERNAME
  const ECONT_PASS = process.env.ECONT_PASSWORD
  if (!ECONT_USER || !ECONT_PASS) {
    console.log("⚠️ Econt credentials not configured — skipping waybill creation")
    return null
  }

  const addr = shippingAddress || {}
  const city = addr.city || ""
  const street = addr.line1 || ""
  const zip = addr.postal_code || ""
  const senderName = process.env.ECONT_SENDER_NAME || "MIREN Magazine"
  const senderPhone = process.env.ECONT_SENDER_PHONE || ""
  const senderOfficeCode = process.env.ECONT_SENDER_OFFICE_CODE || ""
  const senderCity = process.env.ECONT_SENDER_CITY || "Sofia"
  const senderStreet = process.env.ECONT_SENDER_STREET || ""
  const senderNum = process.env.ECONT_SENDER_NUM || ""

  const shipment = {
    senderClient: {
      name: senderName,
      phones: senderPhone ? [{ number: senderPhone }] : [],
    },
    receiverClient: {
      name: fullName || "Customer",
      phones: customerPhone ? [{ number: customerPhone }] : [],
    },
    service: { type: "PACK" },
    packCount: quantity || 1,
    weight: 0.3 * (quantity || 1),
    shipmentDescription: "MIREN Списание",
    payAfterAccept: false,
    payAfterTest: false,
  }

  if (senderOfficeCode) {
    shipment.senderOfficeCode = senderOfficeCode
  } else {
    shipment.senderAddress = {
      city: { name: senderCity, country: { code3: "BGR" } },
      street: senderStreet,
      num: senderNum,
    }
  }

  if (deliveryType === "locker") {
    shipment.receiverOfficeCode = process.env.ECONT_DEFAULT_LOCKER_CODE || ""
    // If no locker code configured, fall back to address delivery
    if (!shipment.receiverOfficeCode) {
      shipment.receiverAddress = { city: { name: city, country: { code3: "BGR" } }, street, zip }
      delete shipment.receiverOfficeCode
    }
  } else if (deliveryType === "office") {
    shipment.receiverOfficeCode = process.env.ECONT_DEFAULT_OFFICE_CODE || ""
    if (!shipment.receiverOfficeCode) {
      shipment.receiverAddress = { city: { name: city, country: { code3: "BGR" } }, street, zip }
      delete shipment.receiverOfficeCode
    }
  } else {
    shipment.receiverAddress = { city: { name: city, country: { code3: "BGR" } }, street, zip }
  }

  try {
    const auth = Buffer.from(`${ECONT_USER}:${ECONT_PASS}`).toString("base64")
    const response = await fetch(
      "https://ee.econt.com/services/Shipments/ShipmentService.createShipments.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
        body: JSON.stringify({ request: { shipments: [shipment], mode: "create" } }),
      }
    )
    const data = await response.json()
    if (data.error) { console.error("ECONT API ERROR:", data.error); return null }
    const shipmentNumber = data.response?.shipments?.[0]?.shipmentNumber || null
    console.log("✅ Econt waybill created:", shipmentNumber)
    return shipmentNumber
  } catch (e) {
    console.error("ECONT WAYBILL ERROR:", e.message)
    return null
  }
}

// ---------------------------------------------------------------
// 3) STRIPE WEBHOOK  (трябва да е ПРЕДИ express.json())
// ---------------------------------------------------------------
// ---------------------------------------------------------------
// 2. STRIPE WEBHOOK  (трябва да е ПРЕДИ express.json())
// ---------------------------------------------------------------
app.post(
  "/api/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"]
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    let event

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (err) {
      console.error(`❌ Webhook Error: ${err.message}`)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object
        const customerEmail = session?.customer_details?.email || ""

        // -----------------------------------------------------------
        // ✅ SUBSCRIPTIONS (existing logic)
        // -----------------------------------------------------------
        if (session.payment_status === "paid" && session.mode === "subscription") {
         let plan = String(session?.metadata?.plan || "").toLowerCase()
          if (!["monthly", "yearly"].includes(plan)) {
            plan = "free"
            if (session.amount_total === 499) plan = "monthly"
            if (session.amount_total === 4999) plan = "yearly"
          }
          try {
            await db.query("UPDATE subscriptions SET plan = $1 WHERE email = $2", [
              plan,
              customerEmail,
            ])
          } catch (dbErr) {
            console.error("DB UPDATE ERROR:", dbErr)
          }
        }

        // -----------------------------------------------------------
        // ✅ STORE ORDERS EMAIL (mode=payment)
        // Sends shipping address + phone + “Three names”
        // -----------------------------------------------------------
        if (session.payment_status === "paid" && session.mode === "payment") {
          try {
            // Save magazine order to DB
            if (session.metadata?.type === "magazine") {
              const qty = parseInt(session.metadata?.quantity || 1)
              const customFields = Array.isArray(session.custom_fields) ? session.custom_fields : []
              const fullNameField = customFields.find((f) => f?.key === "full_name")
              const fullName = fullNameField?.text?.value || ""
              const shipping = session.shipping_details || {}
              const customerPhone = session.customer_details?.phone || ""

              // Get courier info from shipping rate metadata
              let courierName = ""
              let deliveryType = ""
              try {
                if (session.shipping_cost?.shipping_rate) {
                  const rate = await stripe.shippingRates.retrieve(session.shipping_cost.shipping_rate)
                  courierName = rate.metadata?.courier || ""
                  deliveryType = rate.metadata?.delivery_type || ""
                }
              } catch (e) { console.error("SHIPPING RATE ERROR:", e) }

              await db.query(
                `INSERT INTO magazine_orders
                 (stripe_session_id, customer_email, full_name, shipping_address, quantity, amount_total, currency, customer_phone, courier, shipping_type)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (stripe_session_id) DO NOTHING`,
                [
                  session.id, customerEmail, fullName,
                  JSON.stringify(shipping.address || {}),
                  qty, session.amount_total, session.currency,
                  customerPhone, courierName, deliveryType,
                ]
              ).catch((e) => console.error("MAGAZINE ORDER DB ERROR:", e))

              // line items (fetched once, used below)
              let lineItemsData = []
              try {
                const li = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 })
                lineItemsData = li.data || []
              } catch (liErr) { console.error(“LINE ITEMS ERROR:”, liErr) }

              const shippingAddr = shipping.address || {}
              const courierDisplay = courierName === “econt” ? “Econt” : courierName === “speedy” ? “Speedy” : courierName || “”
              const totalStr = ((session.amount_total || 0) / 100).toFixed(2)
              const currencyStr = String(session.currency || “EUR”).toUpperCase()

              // Auto-create Speedy waybill
              if (courierName === “speedy”) {
                try {
                  const waybill = await createSpeedyWaybill({
                    fullName, customerPhone,
                    shippingAddress: shippingAddr,
                    deliveryType, quantity: qty,
                  })
                  if (waybill) {
                    await db.query(
                      “UPDATE magazine_orders SET tracking_number = $1 WHERE stripe_session_id = $2”,
                      [waybill, session.id]
                    )
                    if (customerEmail) {
                      await transporters.login.sendMail({
                        from: `”MIREN Magazine” <${EMAIL_ACCOUNTS.login.user}>`,
                        to: customerEmail,
                        subject: “Пратката ти е на път! 📦 — MIREN Magazine”,
                        html: buildTrackingEmail({
                          fullName, trackingNumber: waybill, courier: “speedy”,
                          trackingUrl: `https://www.speedy.bg/bg/track-shipment/?shipmentNumber=${waybill}`,
                        }),
                      }).catch(e => console.error(“TRACKING EMAIL ERROR:”, e))
                    }
                  }
                } catch (speedyErr) {
                  console.error(“SPEEDY WAYBILL CREATION ERROR:”, speedyErr)
                }
              }

              // Auto-create Econt waybill
              if (courierName === “econt”) {
                try {
                  const waybill = await createEcontWaybill({
                    fullName, customerPhone,
                    shippingAddress: shippingAddr,
                    deliveryType, quantity: qty,
                  })
                  if (waybill) {
                    await db.query(
                      “UPDATE magazine_orders SET tracking_number = $1 WHERE stripe_session_id = $2”,
                      [waybill, session.id]
                    )
                    if (customerEmail) {
                      await transporters.login.sendMail({
                        from: `”MIREN Magazine” <${EMAIL_ACCOUNTS.login.user}>`,
                        to: customerEmail,
                        subject: “Пратката ти е на път! 📦 — MIREN Magazine”,
                        html: buildTrackingEmail({
                          fullName, trackingNumber: waybill, courier: “econt”,
                          trackingUrl: `https://www.econt.com/services/track-shipment.html?shipmentNumber=${waybill}`,
                        }),
                      }).catch(e => console.error(“TRACKING EMAIL ERROR:”, e))
                    }
                  }
                } catch (econtErr) {
                  console.error(“ECONT WAYBILL CREATION ERROR:”, econtErr)
                }
              }

              // Send order confirmation to customer
              if (customerEmail) {
                await transporters.login.sendMail({
                  from: `”MIREN Magazine” <${EMAIL_ACCOUNTS.login.user}>`,
                  to: customerEmail,
                  subject: “Поръчката ти е потвърдена ✅ — MIREN Magazine”,
                  html: buildOrderConfirmationEmail({
                    fullName,
                    customerEmail,
                    items: lineItemsData,
                    total: totalStr,
                    currency: currencyStr,
                    addr: shippingAddr,
                    courierDisplay,
                  }),
                }).catch(e => console.error(“CONFIRMATION EMAIL ERROR:”, e))
              }

              // Internal order email (plain, for admin)
              const internalLines = lineItemsData.map(x => `• ${x.description} x${x.quantity}`).join(“\n”)
              await transporters.login.sendMail({
                from: `”MIREN Orders” <${EMAIL_ACCOUNTS.login.user}>`,
                to: “icaki@mirenmagazine.com”,
                subject: `New Order • ${fullName || customerEmail} • ${totalStr} ${currencyStr}`,
                html: `<pre style=”font-family:monospace;font-size:14px;”>
Session: ${session.id}
Email: ${customerEmail}
Phone: ${customerPhone}
Name: ${fullName}
Courier: ${courierDisplay} (${deliveryType})
Address: ${shippingAddr.line1}, ${shippingAddr.city}, ${shippingAddr.country}

Items:
${internalLines}

Total: ${totalStr} ${currencyStr}
                </pre>`,
              }).catch(e => console.error(“INTERNAL EMAIL ERROR:”, e))

          } catch (mailErr) {
            console.error("ORDER EMAIL ERROR:", mailErr)
          }
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const stripeSub = event.data.object
        const customerId = stripeSub?.customer

        if (customerId) {
          try {
            const customer = await stripe.customers.retrieve(customerId)
            const email = customer?.email || ""
            if (email) {
              await db.query("UPDATE subscriptions SET plan = $1 WHERE email = $2", ["free", email])
            }
          } catch (subErr) {
            console.error("SUBSCRIPTION DELETE HANDLER ERROR:", subErr)
          }
        }
      }

      // Stripe expects 200 fast
      return res.json({ received: true })
    } catch (e) {
      console.error("WEBHOOK HANDLER ERROR:", e)
      return res.json({ received: true }) // still 200 so Stripe doesn't keep retrying forever
    }
  }
)


// ---------------------------------------------------------------
// 4) BODY PARSERS (след webhook-а)
// ---------------------------------------------------------------
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use("/api", heroRoutes)

app.get("/__ping", (req, res) => {
  res.status(200).send("OK FROM NODE: " + new Date().toISOString())
})


// ---------------------------------------------------------------
// 5) AUTH HELPERS
// ---------------------------------------------------------------
function authMiddleware(req, res, next) {
  let token = req.cookies?.token


  // allow Bearer token (mobile / Safari)
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ")
    if (parts.length === 2 && parts[0] === "Bearer") token = parts[1]
  }

  if (!token) return res.status(401).json({ error: "Unauthorized" })

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: "Unauthorized" })
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    const adminEmails = ["info@mirenmagazine.com"]
    if (!adminEmails.includes(req.user.email)) {
      return res.status(403).json({ error: "Admin access required" })
    }
    next()
  })
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

function setAuthCookie(res, token) {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.RENDER ||
    process.env.RENDER_EXTERNAL_URL

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase()
}

async function emailDomainExists(email = "") {
  const normalized = normalizeEmail(email)
  const domain = normalized.split("@")[1] || ""
  if (!domain) return false

  try {
    const mx = await dns.resolveMx(domain)
    if (Array.isArray(mx) && mx.length > 0) return true
  } catch (err) {
    if (!["ENODATA", "ENOTFOUND", "ENOTIMP", "ENOTSUP", "SERVFAIL", "REFUSED"].includes(err?.code)) {
      throw err
    }
  }

  try {
    const [a, aaaa] = await Promise.allSettled([dns.resolve4(domain), dns.resolve6(domain)])
    const hasA = a.status === "fulfilled" && Array.isArray(a.value) && a.value.length > 0
    const hasAAAA = aaaa.status === "fulfilled" && Array.isArray(aaaa.value) && aaaa.value.length > 0
    return hasA || hasAAAA
  } catch {
    return false
  }
}

function makeMirenArtCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < 5; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return `MIREN-${out}`
}

let mirenArtSchemaEnsured = false
async function ensureMirenArtSchema() {
  if (mirenArtSchemaEnsured) return
  await db.query(`
    CREATE TABLE IF NOT EXISTS miren_art_entries (
      email TEXT PRIMARY KEY,
      entry_code TEXT UNIQUE NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  mirenArtSchemaEnsured = true
}



// ---------------------------------------------------------------
// 6) RATE LIMITING
// ---------------------------------------------------------------
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts, try again later." },
})

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: "Too many messages, try again later." },
})

app.use("/api/auth/login", loginLimiter)
app.use("/api/auth/reset-password-request", loginLimiter)
app.use("/api/contact", contactLimiter)


// ---------------------------------------------------------------
// ✅ 8) ROUTERS (AFTER CORS!)
// ---------------------------------------------------------------
app.use("/api", storeRouter)
app.use("/api", leaderboardsRouter)
app.use("/api", userRouter)

// ================================================================
// API ROUTES
// ================================================================

// ---------------------------------------------------------------
// 🔧 MAGIC DB FIX ROUTE – /api/fix-db
// ---------------------------------------------------------------
app.get("/api/fix-db", async (req, res) => {
  try {
    await db.query(
      `ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;`
    )
    await db.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS time TEXT;`)
    await db.query(
      `ALTER TABLE articles ADD COLUMN IF NOT EXISTS article_category TEXT;`
    )
    await db.query(
      `ALTER TABLE articles ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE;`
    )

    await db.query(`
      CREATE TABLE IF NOT EXISTS magazine_issues (
          id SERIAL PRIMARY KEY,
          issue_number TEXT,
          month TEXT,
          year INTEGER,
          is_locked BOOLEAN DEFAULT TRUE,
          cover_url TEXT,
          pages JSONB,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS event_reminders (
        id SERIAL PRIMARY KEY,
        user_email TEXT NOT NULL,
        article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_email, article_id)
      );
    `)

    await db.query(
      `ALTER TABLE magazine_issues ADD COLUMN IF NOT EXISTS hero_vfx_url TEXT;`
    )

    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_handle TEXT;`)
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_updated_at TIMESTAMPTZ;`)
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;`)

    await db.query(`
      CREATE TABLE IF NOT EXISTS magazine_orders (
        id SERIAL PRIMARY KEY,
        stripe_session_id TEXT UNIQUE NOT NULL,
        customer_email TEXT NOT NULL,
        full_name TEXT,
        shipping_address JSONB,
        quantity INTEGER DEFAULT 1,
        amount_total INTEGER,
        currency TEXT,
        status TEXT DEFAULT 'paid',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)

    await db.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS price TEXT;`)
    await db.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS link TEXT;`)
    await db.query(`ALTER TABLE magazine_orders ADD COLUMN IF NOT EXISTS courier TEXT;`)
    await db.query(`ALTER TABLE magazine_orders ADD COLUMN IF NOT EXISTS shipping_type TEXT;`)
    await db.query(`ALTER TABLE magazine_orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;`)
    await db.query(`ALTER TABLE magazine_orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;`)
    await db.query(`ALTER TABLE event_reminders ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;`)

    res.send("✅ УСПЕХ! Базата данни е поправена за новите полета.")
  } catch (e) {
    console.error("FIX-DB ERROR:", e)
    res.status(500).send("ГРЕШКА при поправка: " + e.message)
  }
})

// ---------------------------------------------------------------
// 📧 NEWSLETTER
// ---------------------------------------------------------------
app.post("/api/newsletter/subscribe", async (req, res) => {
  const { email } = req.body
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return res.status(400).json({ error: "Email required" })

  try {
    await db.query(
      "INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING",
      [normalizedEmail]
    )
    res.json({ ok: true, message: "Subscribed!" })
  } catch (err) {
    res.status(500).json({ error: "Database error" })
  }
})

app.get("/api/newsletter/subscribers", adminMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT email, created_at FROM newsletter_subscribers ORDER BY created_at DESC"
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post("/api/newsletter/send", adminMiddleware, async (req, res) => {
  const { subject, body } = req.body
    if (!String(subject || "").trim() || !String(body || "").trim()) {
    return res.status(400).json({ error: "Subject and body are required" })
  }

  try {
    const [usersResult, subscribersResult] = await Promise.all([
      db.query("SELECT email FROM users WHERE email IS NOT NULL"),
      db.query("SELECT email FROM newsletter_subscribers"),
    ])

    const emailSet = new Set()
    for (const row of [...usersResult.rows, ...subscribersResult.rows]) {
      const normalized = normalizeEmail(row?.email)
      if (normalized) emailSet.add(normalized)
    }

        const emails = Array.from(emailSet)
    if (emails.length === 0) {
      return res.status(400).json({ error: "No recipients found" })
    }

    await transporters.newsletter.sendMail({
      from: `"${EMAIL_ACCOUNTS.newsletter.label}" <${EMAIL_ACCOUNTS.newsletter.user}>`,
      bcc: emails,
      subject,
      html: body,
    })

    res.json({ ok: true, count: emails.length })
  } catch (err) {
    res.status(500).json({ error: "Failed to send emails" })
  }
})

// ---------------------------------------------------------------
// 🎨 MIREN ART CODES
// ---------------------------------------------------------------
app.get("/api/miren-art/code", authMiddleware, async (req, res) => {
  try {
    await ensureMirenArtSchema()
    const email = normalizeEmail(req.user?.email || "")
    if (!email) return res.status(401).json({ error: "Unauthorized" })

    const { rows } = await db.query(
      "SELECT email, entry_code, generated_at FROM miren_art_entries WHERE email=$1 LIMIT 1",
      [email]
    )
    const row = rows[0]
    if (!row) return res.json({ ok: true, code: null })

    return res.json({
      ok: true,
      code: row.entry_code,
      generatedAt: row.generated_at,
    })
  } catch (e) {
    console.error("GET /api/miren-art/code error:", e)
    return res.status(500).json({ error: "Failed to load entry code" })
  }
})

app.post("/api/miren-art/code", authMiddleware, async (req, res) => {
  try {
    await ensureMirenArtSchema()
    const email = normalizeEmail(req.user?.email || "")
    if (!email) return res.status(401).json({ error: "Unauthorized" })

    const existing = await db.query(
      "SELECT entry_code, generated_at FROM miren_art_entries WHERE email=$1 LIMIT 1",
      [email]
    )
    if (existing.rows[0]) {
      return res.json({
        ok: true,
        existing: true,
        code: existing.rows[0].entry_code,
        generatedAt: existing.rows[0].generated_at,
      })
    }

    let created = null
    for (let i = 0; i < 8; i += 1) {
      const candidate = makeMirenArtCode()
      try {
        const ins = await db.query(
          `INSERT INTO miren_art_entries (email, entry_code)
           VALUES ($1, $2)
           RETURNING entry_code, generated_at`,
          [email, candidate]
        )
        created = ins.rows[0]
        break
      } catch (err) {
        if (err?.code !== "23505") throw err
      }
    }

    if (!created) {
      return res.status(500).json({ error: "Could not generate unique code" })
    }

    return res.json({
      ok: true,
      existing: false,
      code: created.entry_code,
      generatedAt: created.generated_at,
    })
  } catch (e) {
    console.error("POST /api/miren-art/code error:", e)
    return res.status(500).json({ error: "Failed to generate entry code" })
  }
})

app.get("/api/admin/miren-art/codes", adminMiddleware, async (req, res) => {
  try {
    await ensureMirenArtSchema()
    const { rows } = await db.query(
      `SELECT email, entry_code, generated_at
       FROM miren_art_entries
       ORDER BY generated_at DESC
       LIMIT 1000`
    )
    return res.json(rows)
  } catch (e) {
    console.error("GET /api/admin/miren-art/codes error:", e)
    return res.status(500).json({ error: "Failed to load codes" })
  }
})

app.post("/api/admin/miren-art/reset-codes", adminMiddleware, async (req, res) => {
  try {
    await ensureMirenArtSchema()
    const countResult = await db.query("SELECT COUNT(*)::int AS total FROM miren_art_entries")
    const total = Number(countResult.rows?.[0]?.total || 0)
    await db.query("TRUNCATE TABLE miren_art_entries")
    return res.json({ ok: true, invalidated: total })
  } catch (e) {
    console.error("POST /api/admin/miren-art/reset-codes error:", e)
    return res.status(500).json({ error: "Failed to reset codes" })
  }
})

// ---------------------------------------------------------------
// 👥 ADMIN — USERS
// ---------------------------------------------------------------
app.get("/api/admin/users", adminMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT email, display_name, created_at,
              CASE WHEN google_sub IS NOT NULL THEN true ELSE false END AS is_google
       FROM users ORDER BY created_at DESC`
    )
    res.json(rows)
  } catch (e) {
    try {
      const { rows } = await db.query(
        `SELECT email, display_name, created_at FROM users ORDER BY created_at DESC`
      )
      res.json(rows.map(r => ({ ...r, is_google: false })))
    } catch (e2) {
      res.status(500).json({ error: e2.message })
    }
  }
})

// ---------------------------------------------------------------
// 📦 ADMIN — MAGAZINE ORDERS
// ---------------------------------------------------------------
app.get("/api/admin/magazine-orders", adminMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, stripe_session_id, customer_email, full_name, shipping_address,
              quantity, amount_total, currency, status, courier, shipping_type,
              tracking_number, customer_phone, created_at
       FROM magazine_orders ORDER BY created_at DESC`
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put("/api/admin/magazine-orders/:id/tracking", adminMiddleware, async (req, res) => {
  const { tracking_number } = req.body
  try {
    await db.query(
      "UPDATE magazine_orders SET tracking_number = $1 WHERE id = $2",
      [tracking_number || null, req.params.id]
    )
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post("/api/admin/magazine-orders/:id/refund", adminMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM magazine_orders WHERE id = $1", [req.params.id])
    const order = rows[0]
    if (!order) return res.status(404).json({ error: "Order not found" })
    if (order.status === "refunded") return res.status(400).json({ error: "Already refunded" })

    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
    if (!session.payment_intent) return res.status(400).json({ error: "No payment intent found" })

    await stripe.refunds.create({ payment_intent: session.payment_intent })
    await db.query("UPDATE magazine_orders SET status = 'refunded' WHERE id = $1", [order.id])

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post("/api/admin/magazine-orders/:id/create-waybill", adminMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM magazine_orders WHERE id = $1",
      [req.params.id]
    )
    const order = rows[0]
    if (!order) return res.status(404).json({ error: "Order not found" })
    if (!["econt", "speedy"].includes(order.courier)) return res.status(400).json({ error: "Only Econt/Speedy orders supported" })

    const addr = typeof order.shipping_address === "string"
      ? JSON.parse(order.shipping_address)
      : order.shipping_address || {}

    const waybill = order.courier === "speedy"
      ? await createSpeedyWaybill({ fullName: order.full_name, customerPhone: order.customer_phone, shippingAddress: addr, deliveryType: order.shipping_type, quantity: order.quantity })
      : await createEcontWaybill({ fullName: order.full_name, customerPhone: order.customer_phone, shippingAddress: addr, deliveryType: order.shipping_type, quantity: order.quantity })

    if (!waybill) return res.status(500).json({ error: "Econt API did not return a waybill number" })

    await db.query(
      "UPDATE magazine_orders SET tracking_number = $1 WHERE id = $2",
      [waybill, order.id]
    )
    res.json({ ok: true, tracking_number: waybill })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ---------------------------------------------------------------
// 💳 ADMIN — STRIPE SUBSCRIPTIONS
// ---------------------------------------------------------------
app.get("/api/admin/subscriptions", adminMiddleware, async (req, res) => {
  try {
    const list = await stripe.subscriptions.list({ limit: 100, status: "all" })
    const subs = list.data.map((s) => ({
      id: s.id,
      customer: s.customer,
      email: s.customer_email || null,
      status: s.status,
      plan: s.items?.data?.[0]?.price?.nickname || s.items?.data?.[0]?.price?.id || "—",
      amount: (s.items?.data?.[0]?.price?.unit_amount || 0) / 100,
      currency: s.items?.data?.[0]?.price?.currency || "eur",
      interval: s.items?.data?.[0]?.price?.recurring?.interval || "—",
      current_period_end: s.current_period_end,
      created: s.created,
    }))
    res.json(subs)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ---------------------------------------------------------------
// 🛒 ADMIN — STORE ORDERS (magazine orders alias for Orders tab)
// ---------------------------------------------------------------
app.get("/api/admin/store/orders", adminMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, stripe_session_id, customer_email, full_name, shipping_address,
              quantity, amount_total, currency, status, courier, shipping_type,
              tracking_number, customer_phone, created_at
       FROM magazine_orders ORDER BY created_at DESC`
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ---------------------------------------------------------------
// 📚 MAGAZINES
// ---------------------------------------------------------------
app.get("/api/magazines", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM magazine_issues ORDER BY year DESC, month DESC"
    )

    const mapped = rows.map((row) => {
      let safePages = row.pages

      if (typeof safePages === "string") {
        try {
          safePages = JSON.parse(safePages)
        } catch {
          safePages = []
        }
      }

      if (!Array.isArray(safePages)) safePages = []

      return {
        id: row.id,
        issueNumber: row.issue_number,
        month: row.month,
        year: row.year,
        isLocked: row.is_locked,
        coverUrl: row.cover_url,
        pages: safePages,
        heroVfxUrl: row.hero_vfx_url || null,
      }
    })

    res.json(mapped)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post("/api/magazines", adminMiddleware, async (req, res) => {
  const { issueNumber, month, year, isLocked, coverUrl, pages, heroVfxUrl } =
    req.body

  try {
    const { rows } = await db.query(
      `INSERT INTO magazine_issues
       (issue_number, month, year, is_locked, cover_url, pages, hero_vfx_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        issueNumber,
        month,
        year,
        isLocked,
        coverUrl,
        JSON.stringify(pages),
        heroVfxUrl || null,
      ]
    )
    res.json({ ok: true, issue: rows[0] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put("/api/magazines/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params
  const { issueNumber, month, year, isLocked, coverUrl, pages, heroVfxUrl } =
    req.body
  try {
    await db.query(
      `UPDATE magazine_issues
       SET issue_number=$1, month=$2, year=$3, is_locked=$4, cover_url=$5, pages=$6, hero_vfx_url=$7
       WHERE id=$8`,
      [
        issueNumber,
        month,
        year,
        isLocked,
        coverUrl,
        JSON.stringify(pages),
        heroVfxUrl || null,
        id,
      ]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete("/api/magazines/:id", adminMiddleware, async (req, res) => {
  try {
    await db.query("DELETE FROM magazine_issues WHERE id=$1", [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------
// 📰 ARTICLES
// ---------------------------------------------------------------
app.get("/api/articles", async (req, res) => {
  try {
    const { category } = req.query
    let query = `
      SELECT a.*,
        COALESCE(r.reminder_count, 0)::int AS reminder_count
      FROM articles a
      LEFT JOIN (
        SELECT article_id, COUNT(*) AS reminder_count
        FROM event_reminders
        GROUP BY article_id
      ) r ON r.article_id = a.id
    `
    const params = []

    if (category) {
      query += " WHERE a.category = $1"
      params.push(category)
    }

    query += " ORDER BY a.date DESC"

    const { rows } = await db.query(query, params)

    const mappedRows = rows.map((row) => ({
      id: row.id,
      title: row.title,
      text: row.text,
      author: row.author,
      date: row.date,
      imageUrl: row.image_url,
      articleCategory: row.article_category || "",
      excerpt: row.excerpt,
      isPremium: row.is_premium,
      time: row.time,
      reminderEnabled: row.reminder_enabled || false,
      price: row.price || null,
      link: row.link || null,
      reminderCount: row.reminder_count || 0,
    }))

    res.json(mappedRows)
  } catch (err) {
    console.error("GET /api/articles error:", err)
    res.status(500).json({ error: err.message })
  }
})

app.post("/api/articles", adminMiddleware, async (req, res) => {
  const {
    title, text, author, date, imageUrl, category,
    articleCategory, excerpt, isPremium, time, reminderEnabled, price, link,
  } = req.body

  const normalizedArticleCategory = category === "news" ? articleCategory : null
  const normalizedTime = category === "events" ? time : null
  const normalizedReminder = category === "events" ? !!reminderEnabled : false
  const normalizedPrice = category === "events" ? (price || null) : null
  const normalizedLink = category === "events" ? (link || null) : null

  try {
    const { rows } = await db.query(
      `INSERT INTO articles
       (title, text, author, date, image_url, category, article_category,
        excerpt, is_premium, time, reminder_enabled, price, link)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [title, text, author || "MIREN", date, imageUrl, category,
       normalizedArticleCategory, excerpt, !!isPremium, normalizedTime,
       normalizedReminder, normalizedPrice, normalizedLink]
    )
    res.json({ ok: true, article: rows[0] })
  } catch (err) {
    console.error("POST /api/articles error:", err)
    res.status(500).json({ error: err.message })
  }
})

app.put("/api/articles/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params
  const {
    title, text, author, date, imageUrl, category,
    articleCategory, excerpt, isPremium, time, reminderEnabled, price, link,
  } = req.body

  const normalizedArticleCategory = category === "news" ? articleCategory : null
  const normalizedTime = category === "events" ? time : null
  const normalizedReminder = category === "events" ? !!reminderEnabled : false
  const normalizedPrice = category === "events" ? (price || null) : null
  const normalizedLink = category === "events" ? (link || null) : null

  try {
    const result = await db.query(
      `UPDATE articles
       SET title=$1, text=$2, author=$3, date=$4, image_url=$5,
           category=$6, article_category=$7, excerpt=$8, is_premium=$9,
           time=$10, reminder_enabled=$11, price=$12, link=$13
       WHERE id=$14
       RETURNING *`,
      [title, text, author, date, imageUrl, category,
       normalizedArticleCategory, excerpt, !!isPremium, normalizedTime,
       normalizedReminder, normalizedPrice, normalizedLink, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Article not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error("PUT /api/articles/:id error:", err)
    res.status(500).json({ error: err.message })
  }
})

app.delete("/api/articles/:id", adminMiddleware, async (req, res) => {
  try {
    await db.query("DELETE FROM articles WHERE id = $1", [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    console.error("DELETE /api/articles/:id error:", err)
    res.status(500).json({ error: err.message })
  }
})



// ---------------------------------------------------------------
// 🔔 EVENT REMINDERS
// ---------------------------------------------------------------
app.get("/api/events/reminders", authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT article_id FROM event_reminders WHERE user_email = $1",
      [req.user.email]
    )
    res.json({ articleIds: rows.map((r) => r.article_id) })
  } catch (err) {
    console.error("GET /api/events/reminders error:", err)
    res.status(500).json({ error: err.message })
  }
})

app.post("/api/events/:id/reminder", authMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.id, 10)
  const { enabled } = req.body

  if (!eventId) {
    return res.status(400).json({ error: "Invalid event id" })
  }

  try {
    if (enabled) {
      await db.query(
        `INSERT INTO event_reminders (user_email, article_id)
         VALUES ($1, $2)
         ON CONFLICT (user_email, article_id) DO NOTHING`,
        [req.user.email, eventId]
      )
    } else {
      await db.query(
        `DELETE FROM event_reminders
         WHERE user_email = $1 AND article_id = $2`,
        [req.user.email, eventId]
      )
    }

    res.json({ ok: true, enabled: !!enabled })
  } catch (err) {
    console.error("POST /api/events/:id/reminder error:", err)
    res.status(500).json({ error: err.message })
  }
})

app.post("/api/events/send-reminders", async (req, res) => {
  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split("T")[0]

    const { rows } = await db.query(
      `
      SELECT a.id, a.title, a.date, a.time, r.user_email
      FROM articles a
      JOIN event_reminders r ON r.article_id = a.id
      WHERE a.category = 'events' AND a.date = $1
    `,
      [dateStr]
    )

    if (rows.length === 0) {
      return res.json({ ok: true, sent: 0 })
    }

    const byEmail = {}
    for (const row of rows) {
      if (!byEmail[row.user_email]) byEmail[row.user_email] = []
      byEmail[row.user_email].push(row)
    }

    let sentCount = 0

    for (const [email, events] of Object.entries(byEmail)) {
      const eventRows = events.map((ev) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f0e8e0;">
            <div style="font-weight:700;font-size:1rem;color:#1a1a1a;">${ev.title}</div>
            <div style="color:#8b6f5e;font-size:0.875rem;margin-top:4px;">📅 ${ev.date}${ev.time ? " · " + ev.time : ""}</div>
          </td>
        </tr>`).join("")

      await transporters.fallback.sendMail({
        to: email,
        subject: "MIREN · Утре те очакват събития 📅",
        html: `<!DOCTYPE html><html lang="bg"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#faf6f1;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf6f1;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#c46a4a,#8b3a2a);padding:32px 40px;text-align:center;">
          <div style="font-size:2rem;font-weight:900;letter-spacing:0.12em;color:#fff;">MIREN</div>
          <div style="color:rgba(255,255,255,0.8);font-size:0.85rem;margin-top:4px;letter-spacing:0.06em;">MAGAZINE</div>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 8px;font-size:1.4rem;color:#1a1a1a;">Утре те очакват събития!</h2>
          <p style="margin:0 0 24px;color:#666;font-size:0.95rem;">Напомняме ти за следните предстоящи събития:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0e8e0;border-radius:10px;overflow:hidden;">${eventRows}</table>
          <div style="margin-top:28px;text-align:center;">
            <a href="https://mirenmagazine.com/events" style="display:inline-block;background:#c46a4a;color:#fff;padding:12px 32px;border-radius:8px;font-weight:700;text-decoration:none;">Виж всички събития</a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f0e8e0;text-align:center;">
          <p style="margin:0;color:#aaa;font-size:0.8rem;">© ${new Date().getFullYear()} MIREN Magazine · <a href="https://mirenmagazine.com" style="color:#c46a4a;text-decoration:none;">mirenmagazine.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
      })

      sentCount++
    }

    res.json({ ok: true, sent: sentCount })
  } catch (err) {
    console.error("EVENT REMINDER SEND ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------
// 🔐 AUTH ROUTES
// ---------------------------------------------------------------
app.get("/api/auth/check", async (req, res) => {
  const email = normalizeEmail(req.query?.email || "")
  const displayName = String(req.query?.displayName || "").trim()

  try {
    if (email) {
      const [{ rows }, domainExists] = await Promise.all([
        db.query("SELECT 1 FROM users WHERE lower(email) = lower($1) LIMIT 1", [email]),
        emailDomainExists(email),
      ])

      return res.json({
        taken: rows.length > 0,
        emailExists: domainExists,
      })
    }

    if (displayName) {
      const { rows } = await db.query("SELECT 1 FROM users WHERE lower(display_name) = lower($1) LIMIT 1", [displayName])
      return res.json({ taken: rows.length > 0 })
    }

    return res.status(400).json({ error: "Missing query" })
  } catch (err) {
    return res.status(500).json({ error: "Check failed" })
  }
})

app.post("/api/auth/register", async (req, res) => {
  const { email, password, displayName } = req.body
   const normalizedEmail = normalizeEmail(email)
  const normalizedDisplayName = String(displayName || "").trim()

  if (!normalizedEmail || !password || !normalizedDisplayName) {
    return res.status(400).json({ error: "Missing fields" })
  }

  try {
        const domainExists = await emailDomainExists(normalizedEmail)
    if (!domainExists) {
      return res.status(400).json({ error: "Email not found" })
    }
    const userCheck = await db.query("SELECT * FROM users WHERE lower(email) = lower($1)", [
      normalizedEmail,
    ])
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: "Email taken" })
    }

    const nameCheck = await db.query(
      "SELECT * FROM users WHERE lower(display_name) = lower($1)",
      [normalizedDisplayName]
    )
    if (nameCheck.rows.length > 0) {
      return res.status(409).json({ error: "Display name taken" })
    }

    const hash = await bcrypt.hash(password, 10)
    const token = crypto.randomBytes(32).toString("hex")

    await db.query(
      "INSERT INTO users (email, display_name, password_hash, created_at, confirmation_token, is_confirmed) VALUES ($1,$2,$3,NOW(),$4,false)",
      [normalizedEmail, normalizedDisplayName, hash, token]
    )
    await db.query("INSERT INTO subscriptions (email, plan) VALUES ($1,$2)", [
      normalizedEmail,
      "free",
    ])

    const confirmationUrl = `${APP_URL}/confirm?token=${token}`
    setImmediate(async () => {
      try {
        console.log("📧 CONFIRM EMAIL TO =", email)

        const { info, transporterKey } = await sendWithFallback({
          primary: "login",
          backups: ["fallback"],
          buildMessage: (account) => ({
            from: `"${account.label}" <${account.user}>`,
            to: normalizedEmail,
            subject: "Welcome to MIREN — Confirm your email",
            text: `Welcome to MIREN!\n\nConfirm your email by opening this link:\n${confirmationUrl}\n\nIf you didn't create this account, ignore this email.`,
            html: `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#111;">
      <h2 style="margin:0 0 10px;">Welcome to MIREN</h2>
      <p style="margin:0 0 14px;">
        Thanks for joining MIREN. Please confirm your email to activate your account.
      </p>

      <p style="margin:18px 0;">
        <a href="${confirmationUrl}"
          style="display:inline-block; background:#8b1e1e; color:#fff; padding:12px 18px; border-radius:10px; text-decoration:none; font-weight:700;">
          Confirm email
        </a>
      </p>

      <p style="margin:0 0 10px; font-size:13px; color:#444;">
        If the button doesn’t work, copy and paste this link:
        <br/>
        <span style="word-break:break-all;">${confirmationUrl}</span>
      </p>

      <hr style="border:none; border-top:1px solid #eee; margin:18px 0;" />

      <p style="margin:0; font-size:12px; color:#666;">
        If you didn’t create this account, you can safely ignore this email.
      </p>
    </div>
  `,
         }),
        })

        console.log("✅ CONFIRM EMAIL SENT:", transporterKey, info.messageId, info.response)
            } catch (err) {
        console.error("❌ CONFIRM EMAIL SEND ERROR:", err)
      }
    })

    res.status(201).json({ ok: true, message: "Check email!" })
  } catch (err) {
    res.status(500).json({ error: "Registration failed" })
  }
})

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body
  const normalizedEmail = normalizeEmail(email)
  try {
    const { rows } = await db.query("SELECT * FROM users WHERE lower(email) = lower($1)", [
      normalizedEmail,
    ])
    const user = rows[0]
    if (!user) return res.status(404).json({ error: "User not found" })

    if (!user.password_hash) return res.status(401).json({ error: "This account uses Google Sign-In. Please sign in with Google." })
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(401).json({ error: "Wrong password" })

    if (!user.is_confirmed) {
      return res.status(403).json({ error: "Confirm email first" })
    }

    if (user.two_fa_enabled) {
      return res.json({ ok: true, requires2fa: true })
    }

    const token = signToken({ email: user.email })
    setAuthCookie(res, token)

    res.json({
      ok: true,
      user: { email: user.email, displayName: user.display_name },
      token,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post("/api/auth/logout", (req, res) => {
  const isProduction = process.env.NODE_ENV === "production"
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
  })
  res.json({ ok: true })
})

app.post("/api/auth/confirm", async (req, res) => {
  const { token } = req.body

  try {
    const { rows } = await db.query(
      "SELECT * FROM users WHERE confirmation_token = $1",
      [token]
    )
    if (!rows[0]) {
      return res.status(404).json({ error: "Invalid token" })
    }

    await db.query(
      "UPDATE users SET is_confirmed = true, confirmation_token = NULL WHERE email = $1",
      [rows[0].email]
    )

    const authToken = signToken({ email: rows[0].email })
    setAuthCookie(res, authToken)

    res.json({ ok: true, token: authToken })
  } catch (err) {
    res.status(500).json({ error: "Error" })
  }
})

app.post("/api/auth/reset-password-request", async (req, res) => {
  const { email } = req.body
const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return res.status(400).json({ error: "Email required" })
  try {
    const token = crypto.randomBytes(32).toString("hex")
    const expiry = new Date(Date.now() + 3600000)

    await db.query(
"UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE lower(email) = lower($3)",
      [token, expiry, normalizedEmail]
    )

    const url = `${APP_URL}/reset-password?token=${token}`

    res.json({ ok: true })

    setImmediate(async () => {
      try {
        const info = await transporters.login.sendMail({
  from: `"${EMAIL_ACCOUNTS.login.label}" <${EMAIL_ACCOUNTS.login.user}>`,
  to: normalizedEmail,
  subject: "MIREN — Reset your password",
  html: `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#111;">
      <h2 style="margin:0 0 10px;">Reset your password</h2>
      <p style="margin:0 0 14px;">
        We received a request to reset your MIREN password.
      </p>

      <p style="margin:18px 0;">
        <a href="${url}"
          style="display:inline-block; background:#111; color:#fff; padding:12px 18px; border-radius:10px; text-decoration:none; font-weight:700;">
          Reset password
        </a>
      </p>

      <p style="margin:0 0 10px; font-size:13px; color:#444;">
        If the button doesn’t work, copy and paste this link:
        <br/>
        <span style="word-break:break-all;">${url}</span>
      </p>

      <hr style="border:none; border-top:1px solid #eee; margin:18px 0;" />

      <p style="margin:0; font-size:12px; color:#666;">
        If you didn’t request this, ignore this email — your password won’t change.
      </p>
    </div>
  `,
})

        console.log("✅ RESET EMAIL SENT:", info.messageId, info.response)
      } catch (err) {
        console.error("❌ RESET EMAIL SEND ERROR:", err)
      }
    })
  } catch (e) {
    console.error("RESET REQUEST ERROR:", e)
    res.status(500).json({ error: "Error" })
  }
})

app.post("/api/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body || {}
  const cleanToken = String(token || "").trim()
  const nextPassword = String(newPassword || "")

  if (!cleanToken || !nextPassword) {
    return res.status(400).json({ error: "Token and new password are required" })
  }

  if (nextPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" })
  }

  try {
    const { rows } = await db.query(
 "SELECT id, reset_password_expires FROM users WHERE reset_password_token = $1",
       [cleanToken]
    )
    const user = rows[0]
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" })
    }

        const expiryTs = user.reset_password_expires ? new Date(user.reset_password_expires).getTime() : 0
    if (!expiryTs || Number.isNaN(expiryTs) || Date.now() > expiryTs) {
      return res.status(400).json({ error: "Invalid or expired reset token" })
    }

    const passwordHash = await bcrypt.hash(nextPassword, 10)
    await db.query(
      `UPDATE users
       SET password_hash = $1,
           reset_password_token = NULL,
           reset_password_expires = NULL
       WHERE id = $2`,
      [passwordHash, user.id]
    )

    return res.json({ ok: true })
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err)
    return res.status(500).json({ error: "Error resetting password." })
  }
})

// --- 2FA ---
app.post("/api/auth/send-2fa", async (req, res) => {
  const { email } = req.body
const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return res.status(400).json({ error: "Email required" })
  try {
    const code = crypto.randomInt(100000, 999999).toString()
    const expiry = new Date(Date.now() + 10 * 60 * 1000)

    await db.query(
      "UPDATE users SET two_fa_code = $1, two_fa_expiry = $2 WHERE lower(email) = lower($3)",
      [code, expiry, normalizedEmail]
    )

    await transporters.login.sendMail({
  from: `"${EMAIL_ACCOUNTS.login.label} Security" <${EMAIL_ACCOUNTS.login.user}>`,
to: normalizedEmail,
  subject: "MIREN — Your 2FA code",
  html: `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#111;">
      <h2 style="margin:0 0 10px;">Two-factor authentication</h2>
      <p style="margin:0 0 14px;">
        Use the code below to complete your sign-in. This code expires in <b>10 minutes</b>.
      </p>

      <div style="margin:18px 0; padding:14px 16px; border:1px solid #eee; border-radius:12px; background:#fafafa;">
        <div style="font-size:12px; color:#666; margin-bottom:6px;">Your code</div>
        <div style="font-size:28px; font-weight:800; letter-spacing:3px;">${code}</div>
      </div>

      <p style="margin:0; font-size:12px; color:#666;">
        If you didn’t request this code, you should change your password immediately.
      </p>
    </div>
  `,
})


    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: "Error" })
  }
})

app.post("/api/auth/verify-2fa", async (req, res) => {
  const { email, code } = req.body
    const normalizedEmail = normalizeEmail(email)

  try {
  const { rows } = await db.query("SELECT * FROM users WHERE lower(email) = lower($1)", [normalizedEmail])
    const user = rows[0]
    if (!user) return res.status(404).json({ error: "User not found" })

    if (user.two_fa_code !== code || new Date() > new Date(user.two_fa_expiry)) {
      return res.status(401).json({ error: "Invalid/Expired" })
    }

    await db.query(
       "UPDATE users SET two_fa_enabled = true, two_fa_code = NULL WHERE lower(email) = lower($1)",
      [normalizedEmail]
    )

    const token = signToken({ email: user.email })
    setAuthCookie(res, token)

    // ✅ send "2FA enabled" email (async, doesn't block response)
    setImmediate(async () => {
      try {
        await transporters.login.sendMail({
          from: `"${EMAIL_ACCOUNTS.login.label} Security" <${EMAIL_ACCOUNTS.login.user}>`,
          to: normalizedEmail,  
          subject: "MIREN — 2FA is now enabled",
          html: `
            <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#111;">
              <h2 style="margin:0 0 10px;">2FA enabled</h2>
              <p style="margin:0 0 14px;">
                Two-factor authentication is now enabled on your MIREN account.
              </p>

              <div style="margin:18px 0; padding:14px 16px; border:1px solid #eee; border-radius:12px; background:#fafafa;">
                <div style="font-size:12px; color:#666; margin-bottom:6px;">Account</div>
                <div style="font-size:14px; font-weight:700;">${normalizedEmail}</div>
              </div>

              <p style="margin:0; font-size:12px; color:#666;">
                If this wasn’t you, reset your password immediately.
              </p>
            </div>
          `,
        })
      } catch (err) {
        console.error("❌ 2FA ENABLED EMAIL ERROR:", err)
      }
    })

    return res.json({ ok: true, token })
  } catch (e) {
    return res.status(500).json({ error: "Error" })
  }
})


// ---------------------------------------------------------------
// 🔐 GOOGLE OAUTH
// ---------------------------------------------------------------
app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body
  if (!credential) return res.status(400).json({ error: "Missing credential" })

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: "Google auth not configured on server" })

  try {
    const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID)
    const ticket = await oauthClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    if (!payload?.email) return res.status(401).json({ error: "Invalid Google token" })

    const googleEmail = normalizeEmail(payload.email)
    const googleName = String(payload.name || "").trim()
    const googleSub = String(payload.sub || "")

    if (!googleEmail) return res.status(400).json({ error: "No email from Google" })

    // find or create user
    let { rows } = await db.query("SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1", [googleEmail])
    let user = rows[0]

    if (!user) {
      // generate unique display name
      let displayName = googleName || googleEmail.split("@")[0]
      const taken = await db.query("SELECT 1 FROM users WHERE display_name = $1 LIMIT 1", [displayName])
      if (taken.rows.length > 0) displayName = `${displayName}${Math.floor(Math.random() * 9000) + 1000}`

      const insertRes = await db.query(
        `INSERT INTO users (email, display_name, password_hash, created_at, is_confirmed, google_sub)
         VALUES ($1, $2, NULL, NOW(), true, $3)
         RETURNING *`,
        [googleEmail, displayName, googleSub]
      )
      user = insertRes.rows[0]

      // create free subscription
      await db.query("INSERT INTO subscriptions (email, plan) VALUES ($1, 'free') ON CONFLICT DO NOTHING", [googleEmail])
    } else {
      // update google_sub if missing
      if (!user.google_sub) {
        await db.query("UPDATE users SET google_sub = $1, is_confirmed = true WHERE email = $2", [googleSub, googleEmail])
      }
    }

    const token = signToken({ email: user.email })
    setAuthCookie(res, token)

    return res.json({
      ok: true,
      token,
      user: { email: user.email, displayName: user.display_name },
    })
  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err)
    return res.status(401).json({ error: "Google authentication failed" })
  }
})

// ---------------------------------------------------------------
// 💳 SUBSCRIPTIONS & STRIPE CHECKOUT
// ---------------------------------------------------------------
app.get("/api/subscriptions", authMiddleware, async (req, res) => {
  const { rows } = await db.query(
    "SELECT plan FROM subscriptions WHERE email = $1",
    [req.user.email]
  )
  res.json(rows)
})

app.post("/api/subscriptions/cancel", authMiddleware, async (req, res) => {
  const userEmail = req.user?.email
  const immediate = Boolean(req.body?.immediately)

  if (!userEmail) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const customers = await stripe.customers.list({ email: userEmail, limit: 10 })
    const customerIds = (customers.data || []).map((c) => c.id).filter(Boolean)

    if (customerIds.length === 0) {
      return res.status(404).json({ error: "No Stripe customer found" })
    }

    let changed = 0
    for (const customerId of customerIds) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })
      for (const s of subs.data || []) {
        const actionableStatuses = new Set(["active", "trialing", "past_due", "unpaid"])
        if (!actionableStatuses.has(s.status)) continue
                if (immediate) {
          await stripe.subscriptions.cancel(s.id)
        } else if (!s.cancel_at_period_end) {
          await stripe.subscriptions.update(s.id, { cancel_at_period_end: true })
          } else {
          continue
        }

        changed += 1
      }
    }

    if (changed === 0) {
      return res.status(404).json({ error: "No cancellable subscriptions found" })
        }

    return res.json({
      ok: true,
      canceled: changed,
      mode: immediate ? "immediate" : "period_end",
    })
  } catch (e) {
    console.error("SUBSCRIPTION CANCEL ERROR:", e)
    return res.status(500).json({ error: "Failed to cancel subscription" })
  }
})

app.post("/api/create-checkout-session", authMiddleware, async (req, res) => {
const plan = String(req.body?.plan || "").toLowerCase()
const userEmail = req.user.email

 if (!["monthly", "yearly"].includes(plan)) {
    return res.status(400).json({ error: "Invalid plan" })
  }

  let lineItem
  if (plan === "monthly") {
    lineItem = STRIPE_PRICE_MONTHLY
      ? { price: STRIPE_PRICE_MONTHLY, quantity: 1 }
      : {
          price_data: {
            product_data: { name: "Monthly" },
            unit_amount: 499,
            currency: "eur",
            recurring: { interval: "month" },
          },
          quantity: 1,
        }
  } else {
    lineItem = STRIPE_PRICE_YEARLY
      ? { price: STRIPE_PRICE_YEARLY, quantity: 1 }
      : {
          price_data: {
            product_data: { name: "Yearly" },
            unit_amount: 4999,
            currency: "eur",
            recurring: { interval: "year" },
          },
          quantity: 1,
        }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [lineItem],
      customer_email: userEmail,
           metadata: { plan },
      success_url: `${APP_URL}/profile?payment_success=true`,
      cancel_url: `${APP_URL}/subscriptions`,
    })

    res.json({ url: session.url })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ---------------------------------------------------------------
// 📦 MAGAZINE STOCK
// ---------------------------------------------------------------
app.get("/api/magazine/stock", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT COALESCE(SUM(quantity),0) AS sold FROM magazine_orders WHERE status = 'paid'"
    )
    const sold = parseInt(rows[0]?.sold || 0)
    const remaining = Math.max(0, MAGAZINE_STOCK_TOTAL - sold)
    res.json({ total: MAGAZINE_STOCK_TOTAL, sold, remaining })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post("/api/create-magazine-checkout", async (req, res) => {
  const quantity = Math.max(1, parseInt(req.body?.quantity || 1))
  const userEmail = req.user?.email || req.body?.email || ""

  try {
    const { rows } = await db.query(
      "SELECT COALESCE(SUM(quantity),0) AS sold FROM magazine_orders WHERE status = 'paid'"
    )
    const sold = parseInt(rows[0]?.sold || 0)
    const remaining = MAGAZINE_STOCK_TOTAL - sold
    if (quantity > remaining) {
      return res.status(400).json({ error: `Only ${remaining} copies left` })
    }

    const lineItem = STRIPE_PRICE_MAGAZINE
      ? { price: STRIPE_PRICE_MAGAZINE, quantity }
      : {
          price_data: {
            product_data: { name: "MIREN Списание" },
            unit_amount: 1499,
            currency: "eur",
          },
          quantity,
        }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [lineItem],
      ...(userEmail ? { customer_email: userEmail } : {}),
      custom_fields: [
        {
          key: "full_name",
          label: { type: "custom", custom: "Три имена / Full name" },
          type: "text",
        },
      ],
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
            delivery_estimate: {
              minimum: { unit: "business_day", value: 1 },
              maximum: { unit: "business_day", value: 2 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 299, currency: "eur" },
            display_name: "Econt — До офис",
            metadata: { courier: "econt", delivery_type: "office" },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 1 },
              maximum: { unit: "business_day", value: 2 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 499, currency: "eur" },
            display_name: "Econt — До адрес",
            metadata: { courier: "econt", delivery_type: "courier" },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 1 },
              maximum: { unit: "business_day", value: 3 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 249, currency: "eur" },
            display_name: "Speedy — До автомат (Speedy Box)",
            metadata: { courier: "speedy", delivery_type: "locker" },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 1 },
              maximum: { unit: "business_day", value: 2 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 499, currency: "eur" },
            display_name: "Speedy — До адрес",
            metadata: { courier: "speedy", delivery_type: "courier" },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 1 },
              maximum: { unit: "business_day", value: 3 },
            },
          },
        },
      ],
      metadata: { type: "magazine", quantity: String(quantity) },
      success_url: `${APP_URL}/store?order=success`,
      cancel_url: `${APP_URL}/store`,
    })

    res.json({ url: session.url })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ---------------------------------------------------------------
// 📩 CONTACT FORM
// ---------------------------------------------------------------
app.post("/api/contact", async (req, res) => {
  const email = String(req.body?.email || "").trim()
  const message = String(req.body?.message || "").trim()

  if (!email || !message) {
    return res.status(400).json({ error: "Email and message are required." })
  }

  try {
    await transporters.contact.sendMail({
      from: `"${EMAIL_ACCOUNTS.contact.label}" <${EMAIL_ACCOUNTS.contact.user}>`,
      replyTo: email,
      to: EMAIL_ACCOUNTS.contact.user,
      subject: `Contact from ${email}`,
      text: `From: ${email}\n\n${message}`,
    })
    return res.json({ ok: true, to: EMAIL_ACCOUNTS.contact.user })
  } catch (error) {
    console.error("CONTACT EMAIL ERROR:", error)
    return res.status(500).json({ error: "Could not send message right now." })
  }
})

// ---------------------------------------------------------------
// 🎮 WORD GAME HELPERS (kept)
// ---------------------------------------------------------------
function utcYmd(date = new Date()) {
  return date.toISOString().slice(0, 10)
}
function ymdToDate(ymd) {
  return new Date(`${ymd}T00:00:00.000Z`)
}
function daysBetweenUtcYmd(aYmd, bYmd) {
  const a = ymdToDate(aYmd)
  const b = ymdToDate(bYmd)
  const ms = b.getTime() - a.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}
function computeEffectiveStreak(streak, lastWinYmd, todayYmd) {
  if (!streak || !lastWinYmd) return 0
  const diff = daysBetweenUtcYmd(lastWinYmd, todayYmd)
  if (diff === 0 || diff === 1) return Number(streak) || 0
  return 0
}

// ---------------------------------------------------------------
// ✅ SERVE FRONTEND (Vite build) - ALWAYS (Render one-service)
// Project structure:
//   /server/src/index.js
//   /client/dist
// ---------------------------------------------------------------
// ✅ correct paths when running: node server/src/index.js
const distPath = path.resolve(__dirname, "..", "..", "client", "dist")
const indexHtml = path.join(distPath, "index.html")

console.log("✅ FRONTEND distPath =", distPath)
console.log("✅ FRONTEND indexHtml =", indexHtml)

app.use(
  express.static(distPath, {
    index: false,
    setHeaders: (res, filePath) => {
      // IMPORTANT: never cache index.html
      if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-store")
    },
  })
)

app.use("/api", require("./routes/upload"))

// ✅ SPA fallback: ANY non-API route must return index.html
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found" })
  return res.sendFile(indexHtml)
})


// ---------------------------------------------------------------
// CRON — Event reminders (проверява на всеки 5 минути, праща точно 24h преди)
// ---------------------------------------------------------------
cron.schedule("*/5 * * * *", async () => {
  try {
    // Window: събития чийто час е между 23h55m и 24h05m от сега
    const { rows } = await db.query(`
      SELECT a.id, a.title, a.date, a.time, r.user_email, r.id AS reminder_id
      FROM articles a
      JOIN event_reminders r ON r.article_id = a.id
      WHERE a.category = 'events'
        AND r.reminder_sent_at IS NULL
        AND (
          (a.date || ' ' || COALESCE(a.time, '12:00'))::timestamp AT TIME ZONE 'Europe/Sofia'
          BETWEEN (NOW() + INTERVAL '23 hours 55 minutes')
              AND (NOW() + INTERVAL '24 hours 5 minutes')
        )
    `)

    if (rows.length === 0) return

    const byEmail = {}
    for (const row of rows) {
      if (!byEmail[row.user_email]) byEmail[row.user_email] = []
      byEmail[row.user_email].push(row)
    }

    for (const [email, events] of Object.entries(byEmail)) {
      const eventRows = events.map((ev) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f0e8e0;">
            <div style="font-weight:700;font-size:1rem;color:#1a1a1a;">${ev.title}</div>
            <div style="color:#8b6f5e;font-size:0.875rem;margin-top:4px;">📅 ${ev.date}${ev.time ? " · " + ev.time : ""}</div>
          </td>
        </tr>`).join("")

      await transporters.fallback.sendMail({
        to: email,
        subject: "MIREN · Утре те очакват събития 📅",
        html: `<!DOCTYPE html><html lang="bg"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#faf6f1;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf6f1;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#c46a4a,#8b3a2a);padding:32px 40px;text-align:center;">
          <div style="font-size:2rem;font-weight:900;letter-spacing:0.12em;color:#fff;">MIREN</div>
          <div style="color:rgba(255,255,255,0.8);font-size:0.85rem;margin-top:4px;letter-spacing:0.06em;">MAGAZINE</div>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 8px;font-size:1.4rem;color:#1a1a1a;">Утре те очакват събития!</h2>
          <p style="margin:0 0 24px;color:#666;font-size:0.95rem;">Напомняме ти за следните предстоящи събития:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0e8e0;border-radius:10px;overflow:hidden;">${eventRows}</table>
          <div style="margin-top:28px;text-align:center;">
            <a href="https://mirenmagazine.com/events" style="display:inline-block;background:#c46a4a;color:#fff;padding:12px 32px;border-radius:8px;font-weight:700;text-decoration:none;">Виж всички събития</a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f0e8e0;text-align:center;">
          <p style="margin:0;color:#aaa;font-size:0.8rem;">© ${new Date().getFullYear()} MIREN Magazine · <a href="https://mirenmagazine.com" style="color:#c46a4a;text-decoration:none;">mirenmagazine.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
      })

      // Маркира като изпратен за да не се прати пак
      await db.query(
        "UPDATE event_reminders SET reminder_sent_at = NOW() WHERE id = ANY($1)",
        [events.map((e) => e.reminder_id)]
      )
    }

    console.log(`⏰ CRON: sent reminders for ${rows.length} subscriptions`)
  } catch (e) {
    console.error("⏰ CRON ERROR:", e.message)
  }
})

// ---------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})
