// ================================================================
// SERVER/INDEX.JS - MIREN API (SECURE VERSION)
// ================================================================

require("dotenv").config()
const express = require("express")
const rateLimit = require("express-rate-limit")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer")
const crypto = require("crypto")
const db = require("./db")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const helmet = require("helmet")
const path = require("path")
const fs = require("fs")

// ✅ ROUTERS
const storeRouter = require("./routes/store")
const userStreakRouter = require("./routes/userStreak")
const leaderboardsRouter = require("./routes/leaderboards")

const app = express()

const PORT = process.env.PORT || 8080
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"
const APP_URL = process.env.APP_URL || "http://localhost:5173"

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        // ако имаш други домейни, добави ги тук
        "img-src": ["'self'", "data:", "https://res.cloudinary.com"],
        "media-src": ["'self'", "https://res.cloudinary.com"],
        "connect-src": ["'self'", "https://res.cloudinary.com"],
      },
    },
  })
)

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
  "https://miren-app.onrender.com",    // ако още го ползваш
  "http://localhost:5173",
  "http://localhost:8080",
].filter(Boolean)

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true)

    // ❗ НЕ хвърляме Error (това прави 500)
    return cb(null, false)
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}

// ✅ CORS само за API:
app.use("/api", cors(corsOptions))
app.options("/api/*", cors(corsOptions))


// ---------------------------------------------------------------
// 2) SECURITY + COOKIES
// ---------------------------------------------------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
)

app.use(cookieParser())

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
          let plan = "free"
          if (session.amount_total === 499) plan = "monthly"
          if (session.amount_total === 4999) plan = "yearly"

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
            const adminTo = [
              "mirenmagazine@gmail.com",
              "icaki06@gmail.com",
              "icaki2k@gmail.com",
            ]

            // line items
            let lines = "(no items)"
            try {
              const items = await stripe.checkout.sessions.listLineItems(session.id, {
                limit: 100,
              })
              lines = (items.data || [])
                .map((x) => `• ${x.description} x${x.quantity}`)
                .join("<br/>") || "(no items)"
            } catch (liErr) {
              console.error("LINE ITEMS ERROR:", liErr)
            }

            const customer = session.customer_details || {}
            const shipping = session.shipping_details || {}
            const addr = shipping.address || {}

            // custom_fields contains your “Three names”
            const customFields = Array.isArray(session.custom_fields)
              ? session.custom_fields
              : []
            const fullNameField = customFields.find((f) => f?.key === "full_name")
            const fullName = fullNameField?.text?.value || ""

            const total = ((session.amount_total || 0) / 100).toFixed(2)
            const currency = String(session.currency || "").toUpperCase()

            const html = `
              <h2>✅ New Paid Order</h2>

              <p><b>Session:</b> ${session.id}</p>
              <p><b>Total:</b> ${total} ${currency}</p>

              <hr/>

              <p><b>Three names (Три имена):</b> ${fullName || "(not provided)"}</p>
              <p><b>Email:</b> ${customer.email || ""}</p>
              <p><b>Phone:</b> ${customer.phone || ""}</p>

              <p><b>Shipping name:</b> ${shipping.name || ""}</p>

              <p><b>Address:</b><br/>
                ${addr.line1 || ""}<br/>
                ${addr.line2 || ""}<br/>
                ${addr.postal_code || ""} ${addr.city || ""}<br/>
                ${addr.country || ""}
              </p>

              <hr/>

              <p><b>Items:</b><br/>${lines}</p>
            `

            await transporter.sendMail({
              from: `"MIREN Orders" <${process.env.EMAIL_USER}>`,
              to: adminTo.join(","),
              subject: `New Order • ${session.id}`,
              html,
            })
          } catch (mailErr) {
            console.error("ORDER EMAIL ERROR:", mailErr)
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

app.get("/__ping", (req, res) => {
  res.status(200).send("OK FROM NODE: " + new Date().toISOString())
})


// ---------------------------------------------------------------
// 5) AUTH HELPERS
// ---------------------------------------------------------------
function authMiddleware(req, res, next) {
  let token = req.cookies?.auth

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
    const adminEmails = [
      "icaki06@gmail.com",
      "icaki2k@gmail.com",
      "mirenmagazine@gmail.com",
    ]
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

  res.cookie("auth", token, {
    httpOnly: true,
    secure: !!isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  })
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
// 7) EMAIL TRANSPORTER
// ---------------------------------------------------------------
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  pool: true,
  maxConnections: 2,
  maxMessages: 50,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

transporter.verify((err) => {
  if (err) console.error("❌ EMAIL TRANSPORT VERIFY FAILED:", err)
  else console.log("✅ EMAIL TRANSPORT READY")
})

// ---------------------------------------------------------------
// ✅ 8) ROUTERS (AFTER CORS!)
// ---------------------------------------------------------------
app.use("/api", storeRouter)
app.use("/api", leaderboardsRouter)
app.use("/api", userStreakRouter)

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
  if (!email) return res.status(400).json({ error: "Email required" })

  try {
    await db.query(
      "INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING",
      [email]
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
  try {
    const { rows } = await db.query("SELECT email FROM newsletter_subscribers")
    if (rows.length === 0) {
      return res.status(400).json({ error: "No subscribers found" })
    }

    const emails = rows.map((r) => r.email)

    await transporter.sendMail({
      from: `"MIREN Newsletter" <${process.env.EMAIL_USER}>`,
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
    let query = "SELECT * FROM articles"
    const params = []

    if (category) {
      query += " WHERE category = $1"
      params.push(category)
    }

    query += " ORDER BY date DESC"

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
    }))

    res.json(mappedRows)
  } catch (err) {
    console.error("GET /api/articles error:", err)
    res.status(500).json({ error: err.message })
  }
})

app.post("/api/articles", adminMiddleware, async (req, res) => {
  const {
    title,
    text,
    author,
    date,
    imageUrl,
    category,
    articleCategory,
    excerpt,
    isPremium,
    time,
    reminderEnabled,
  } = req.body

  const normalizedArticleCategory = category === "news" ? articleCategory : null
  const normalizedTime = category === "events" ? time : null
  const normalizedReminder = category === "events" ? !!reminderEnabled : false

  try {
    const { rows } = await db.query(
      `INSERT INTO articles
       (title, text, author, date, image_url, category, article_category,
        excerpt, is_premium, time, reminder_enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        title,
        text,
        author || "MIREN",
        date,
        imageUrl,
        category,
        normalizedArticleCategory,
        excerpt,
        !!isPremium,
        normalizedTime,
        normalizedReminder,
      ]
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
    title,
    text,
    author,
    date,
    imageUrl,
    category,
    articleCategory,
    excerpt,
    isPremium,
    time,
    reminderEnabled,
  } = req.body

  const normalizedArticleCategory = category === "news" ? articleCategory : null
  const normalizedTime = category === "events" ? time : null
  const normalizedReminder = category === "events" ? !!reminderEnabled : false

  try {
    const result = await db.query(
      `UPDATE articles
       SET title=$1, text=$2, author=$3, date=$4, image_url=$5,
           category=$6, article_category=$7,
           excerpt=$8, is_premium=$9, time=$10, reminder_enabled=$11
       WHERE id=$12
       RETURNING *`,
      [
        title,
        text,
        author,
        date,
        imageUrl,
        category,
        normalizedArticleCategory,
        excerpt,
        !!isPremium,
        normalizedTime,
        normalizedReminder,
        id,
      ]
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
      const htmlList = events
        .map(
          (ev) => `
        <li>
          <strong>${ev.title}</strong><br/>
          Date: ${ev.date}${ev.time ? " " + ev.time : ""}
        </li>`
        )
        .join("")

      await transporter.sendMail({
        to: email,
        subject: "MIREN - Event reminder for tomorrow",
        html: `<p>You have upcoming events tomorrow:</p><ul>${htmlList}</ul>`,
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
app.post("/api/auth/register", async (req, res) => {
  const { email, password, displayName } = req.body
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: "Missing fields" })
  }

  try {
    const userCheck = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ])
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: "Email taken" })
    }

    const nameCheck = await db.query(
      "SELECT * FROM users WHERE display_name = $1",
      [displayName]
    )
    if (nameCheck.rows.length > 0) {
      return res.status(409).json({ error: "Display name taken" })
    }

    const hash = await bcrypt.hash(password, 10)
    const token = crypto.randomBytes(32).toString("hex")

    await db.query(
      "INSERT INTO users (email, display_name, password_hash, created_at, confirmation_token, is_confirmed) VALUES ($1,$2,$3,NOW(),$4,false)",
      [email, displayName, hash, token]
    )
    await db.query("INSERT INTO subscriptions (email, plan) VALUES ($1,$2)", [
      email,
      "free",
    ])

    const confirmationUrl = `${APP_URL}/confirm?token=${token}`
    setImmediate(async () => {
      try {
        const info = await transporter.sendMail({
          from: `"MIREN" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Confirm Account",
          html: `<p>Confirm your account:</p><a href="${confirmationUrl}">Click to Confirm Email</a>`,
        })
        console.log("✅ CONFIRM EMAIL SENT:", info.messageId, info.response)
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

  try {
    const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ])
    const user = rows[0]
    if (!user) return res.status(404).json({ error: "User not found" })

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
  res.clearCookie("auth", {
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

app.get("/api/user/me", authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT email, display_name, last_username_change, two_fa_enabled FROM users WHERE email = $1",
      [req.user.email]
    )
    if (!rows[0]) return res.status(404).json({ error: "User not found" })

    res.json({
      email: rows[0].email,
      displayName: rows[0].display_name,
      twoFaEnabled: rows[0].two_fa_enabled,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post("/api/auth/reset-password-request", async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: "Email required" })

  try {
    const token = crypto.randomBytes(32).toString("hex")
    const expiry = new Date(Date.now() + 3600000)

    await db.query(
      "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3",
      [token, expiry, email]
    )

    const url = `${APP_URL}/reset-password?token=${token}`

    res.json({ ok: true })

    setImmediate(async () => {
      try {
        const info = await transporter.sendMail({
          from: `"MIREN" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Reset Password",
          html: `<p>Click to reset your password:</p><a href="${url}">Reset Here</a>`,
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

// --- 2FA ---
app.post("/api/auth/send-2fa", async (req, res) => {
  const { email } = req.body

  try {
    const code = crypto.randomInt(100000, 999999).toString()
    const expiry = new Date(Date.now() + 10 * 60 * 1000)

    await db.query(
      "UPDATE users SET two_fa_code = $1, two_fa_expiry = $2 WHERE email = $3",
      [code, expiry, email]
    )

    await transporter.sendMail({
      to: email,
      subject: "2FA Code",
      html: `Code: ${code}`,
    })

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: "Error" })
  }
})

app.post("/api/auth/verify-2fa", async (req, res) => {
  const { email, code } = req.body

  try {
    const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ])
    const user = rows[0]
    if (!user) return res.status(404).json({ error: "User not found" })

    if (user.two_fa_code !== code || new Date() > new Date(user.two_fa_expiry)) {
      return res.status(401).json({ error: "Invalid/Expired" })
    }

    await db.query(
      "UPDATE users SET two_fa_enabled = true, two_fa_code = NULL WHERE email = $1",
      [email]
    )

    const token = signToken({ email: user.email })
    setAuthCookie(res, token)

    res.json({ ok: true, token })
  } catch (e) {
    res.status(500).json({ error: "Error" })
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

app.post("/api/create-checkout-session", authMiddleware, async (req, res) => {
  const { plan } = req.body
  const userEmail = req.user.email

  let priceData
  if (plan === "monthly") {
    priceData = {
      product_data: { name: "Monthly" },
      unit_amount: 499,
      currency: "eur",
      recurring: { interval: "month" },
    }
  } else {
    priceData = {
      product_data: { name: "Yearly" },
      unit_amount: 4999,
      currency: "eur",
      recurring: { interval: "year" },
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price_data: priceData, quantity: 1 }],
      customer_email: userEmail,
      success_url: `${APP_URL}/profile?payment_success=true`,
      cancel_url: `${APP_URL}/subscriptions`,
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
  const { email, message } = req.body
  await transporter.sendMail({
    from: email,
    to: process.env.EMAIL_USER,
    subject: "Contact",
    text: message,
  })
  res.json({ ok: true })
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

// ✅ SPA fallback: ANY non-API route must return index.html
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found" })
  return res.sendFile(indexHtml)
})

app.use("/api", require("./routes/upload"))

// ---------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})
