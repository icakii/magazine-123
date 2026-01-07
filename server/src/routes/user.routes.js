// server/routes/user.routes.js
const express = require("express")
const jwt = require("jsonwebtoken")
const db = require("../db")

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"
const COOLDOWN_DAYS = 14

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

function daysBetween(a, b) {
  const ms = Math.abs(a.getTime() - b.getTime())
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

// ✅ GET /api/user/me
router.get("/user/me", authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT email, display_name, last_username_change, two_fa_enabled FROM users WHERE email = $1",
      [req.user.email]
    )
    if (!rows[0]) return res.status(404).json({ error: "User not found" })

    res.json({
      email: rows[0].email,
      displayName: rows[0].display_name,
      lastUsernameChange: rows[0].last_username_change, // ✅ важно за cooldown-а
      twoFaEnabled: rows[0].two_fa_enabled,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ POST /api/user/update-username
router.post("/user/update-username", authMiddleware, async (req, res) => {
  const newUsername = String(req.body?.newUsername || "").trim()

  if (newUsername.length < 3) {
    return res.status(400).json({ error: "Name too short (min 3 chars)" })
  }

  try {
    // 1) check premium
    const sub = await db.query("SELECT plan FROM subscriptions WHERE email = $1", [
      req.user.email,
    ])
    const plan = String(sub.rows?.[0]?.plan || "free").toLowerCase()
    const isPremium = plan === "monthly" || plan === "yearly"

    if (!isPremium) {
      return res.status(403).json({ error: "Premium feature" })
    }

    // 2) cooldown 14 days
    const userQ = await db.query(
      "SELECT last_username_change FROM users WHERE email = $1",
      [req.user.email]
    )
    if (!userQ.rows[0]) return res.status(404).json({ error: "User not found" })

    const last = userQ.rows[0].last_username_change
      ? new Date(userQ.rows[0].last_username_change)
      : null

    if (last) {
      const diff = daysBetween(new Date(), last)
      if (diff < COOLDOWN_DAYS) {
        const left = COOLDOWN_DAYS - diff
        return res.status(429).json({
          error: `You can change your username once every ${COOLDOWN_DAYS} days`,
          daysLeft: left,
        })
      }
    }

    // 3) unique display_name
    const taken = await db.query(
      "SELECT 1 FROM users WHERE lower(display_name) = lower($1) AND email <> $2 LIMIT 1",
      [newUsername, req.user.email]
    )
    if (taken.rows.length > 0) {
      return res.status(409).json({ error: "Display name taken" })
    }

    // 4) update
    const upd = await db.query(
      `UPDATE users
       SET display_name = $1,
           last_username_change = NOW()
       WHERE email = $2
       RETURNING email, display_name, last_username_change`,
      [newUsername, req.user.email]
    )

    return res.json({
      ok: true,
      email: upd.rows[0].email,
      displayName: upd.rows[0].display_name,
      lastUsernameChange: upd.rows[0].last_username_change,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

module.exports = router
