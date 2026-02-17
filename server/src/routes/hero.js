// server/src/routes/hero.js
const express = require("express")
const router = express.Router()
const db = require("../db")
const auth = require("../middleware/auth.middleware")

const ADMIN_EMAILS = ["icaki06@gmail.com", "icaki2k@gmail.com", "mirenmagazine@gmail.com"]
function isAdmin(email) {
  return !!email && ADMIN_EMAILS.includes(email)
}

let heroSchemaReady = false
async function ensureHeroSchema() {
  if (heroSchemaReady) return

  await db.query(`
    CREATE TABLE IF NOT EXISTS hero_settings (
      id INTEGER PRIMARY KEY,
      hero_vfx_url TEXT,
      hero_media_url TEXT,
      spotify_playlist_url TEXT,
      home_calendar_json JSONB
    )
  `)

  await db.query(`ALTER TABLE hero_settings ADD COLUMN IF NOT EXISTS hero_vfx_url TEXT`)
  await db.query(`ALTER TABLE hero_settings ADD COLUMN IF NOT EXISTS hero_media_url TEXT`)
  await db.query(`ALTER TABLE hero_settings ADD COLUMN IF NOT EXISTS spotify_playlist_url TEXT`)
  await db.query(`ALTER TABLE hero_settings ADD COLUMN IF NOT EXISTS home_calendar_json JSONB`)

  heroSchemaReady = true
}

// Public (frontend) can read hero/home settings
router.get("/hero", async (req, res) => {
  try {
        await ensureHeroSchema()  
    const { rows } = await db.query(
  `SELECT hero_vfx_url AS "heroVfxUrl",
              hero_media_url AS "heroMediaUrl",
              spotify_playlist_url AS "spotifyPlaylistUrl",
              home_calendar_json AS "calendarEvents"
       FROM hero_settings
       WHERE id=1`
    )
    res.json(rows[0] || { heroVfxUrl: "", heroMediaUrl: "", spotifyPlaylistUrl: "", calendarEvents: [] })
    } catch (e) {
    console.error("HERO GET ERROR:", e)
    res.json({ heroVfxUrl: "" })
  }
})

// Admin update hero/hero settings
router.put("/admin/hero", auth, async (req, res) => {
  try {
    const email = req.user?.email
    if (!email) return res.status(401).json({ error: "Unauthorized" })
    if (!isAdmin(email)) return res.status(403).json({ error: "Admin access required" })

await ensureHeroSchema()

    const heroVfxUrl = String(req.body?.heroVfxUrl || "")
    const heroMediaUrl = String(req.body?.heroMediaUrl || "")
    const spotifyPlaylistUrl = String(req.body?.spotifyPlaylistUrl || "")
    const calendarEvents = Array.isArray(req.body?.calendarEvents) ? req.body.calendarEvents : []

    await db.query(
      `INSERT INTO hero_settings (id, hero_vfx_url, hero_media_url, spotify_playlist_url, home_calendar_json)
       VALUES (1, $1, $2, $3, $4::jsonb)
       ON CONFLICT (id) DO UPDATE
       SET hero_vfx_url = EXCLUDED.hero_vfx_url,
           hero_media_url = EXCLUDED.hero_media_url,
           spotify_playlist_url = EXCLUDED.spotify_playlist_url,
           home_calendar_json = EXCLUDED.home_calendar_json`,
      [heroVfxUrl, heroMediaUrl, spotifyPlaylistUrl, JSON.stringify(calendarEvents)]
    )

    res.json({ ok: true, heroVfxUrl, heroMediaUrl, spotifyPlaylistUrl, calendarEvents })
  } catch (e) {
    console.error("HERO PUT ERROR:", e)
    res.status(500).json({ error: "Failed to save hero" })
  }
})

module.exports = router
