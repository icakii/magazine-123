// server/src/routes/hero.js
const express = require("express")
const router = express.Router()
const db = require("../db")
const auth = require("../middleware/auth.middleware")

const ADMIN_EMAILS = ["icaki06@gmail.com", "icaki2k@gmail.com", "mirenmagazine@gmail.com"]
function isAdmin(email) {
  return !!email && ADMIN_EMAILS.includes(email)
}

// GET /api/hero  -> връща 1 hero (или null)
router.get("/hero", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, hero_vfx_url AS "heroVfxUrl", updated_at AS "updatedAt"
       FROM hero
       ORDER BY id DESC
       LIMIT 1`
    )
    res.json(rows[0] || null)
  } catch (e) {
    console.error("HERO GET ERROR:", e)
    res.status(500).json({ error: "Failed to load hero" })
  }
})

// PUT /api/hero -> replace hero (admin)
router.put("/hero", auth, async (req, res) => {
  try {
    const email = req.user?.email
    if (!email) return res.status(401).json({ error: "Unauthorized" })
    if (!isAdmin(email)) return res.status(403).json({ error: "Admin access required" })

    const { heroVfxUrl } = req.body || {}
    if (!heroVfxUrl) return res.status(400).json({ error: "heroVfxUrl required" })

    // upsert single row
    const { rows } = await db.query(`SELECT id FROM hero ORDER BY id DESC LIMIT 1`)
    if (rows[0]?.id) {
      await db.query(
        `UPDATE hero SET hero_vfx_url=$1, updated_at=NOW() WHERE id=$2`,
        [heroVfxUrl, rows[0].id]
      )
      return res.json({ ok: true })
    }

    await db.query(
      `INSERT INTO hero (hero_vfx_url, updated_at) VALUES ($1, NOW())`,
      [heroVfxUrl]
    )

    return res.json({ ok: true })
  } catch (e) {
    console.error("HERO PUT ERROR:", e)
    res.status(500).json({ error: "Failed to save hero" })
  }
})

module.exports = router
