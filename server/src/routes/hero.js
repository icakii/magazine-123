// server/src/routes/hero.js
const express = require("express")
const router = express.Router()
const db = require("../db")
const auth = require("../middleware/auth.middleware")

const ADMIN_EMAILS = ["icaki06@gmail.com", "icaki2k@gmail.com", "mirenmagazine@gmail.com"]
function isAdmin(email) {
  return !!email && ADMIN_EMAILS.includes(email)
}

// Public (frontend) can read hero settings
router.get("/hero", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT hero_vfx_url AS "heroVfxUrl"
       FROM hero_settings
       WHERE id=1`
    )
    res.json(rows[0] || { heroVfxUrl: "" })
  } catch (e) {
    console.error("HERO GET ERROR:", e)
    res.json({ heroVfxUrl: "" })
  }
})

// Admin update hero
router.put("/admin/hero", auth, async (req, res) => {
  try {
    const email = req.user?.email
    if (!email) return res.status(401).json({ error: "Unauthorized" })
    if (!isAdmin(email)) return res.status(403).json({ error: "Admin access required" })

    const heroVfxUrl = String(req.body?.heroVfxUrl || "")

    await db.query(
      `INSERT INTO hero_settings (id, hero_vfx_url)
       VALUES (1, $1)
       ON CONFLICT (id) DO UPDATE SET hero_vfx_url = EXCLUDED.hero_vfx_url`,
      [heroVfxUrl]
    )

    res.json({ ok: true, heroVfxUrl })
  } catch (e) {
    console.error("HERO PUT ERROR:", e)
    res.status(500).json({ error: "Failed to save hero" })
  }
})

module.exports = router
