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

function normalizeCalendarEvents(raw) {
  let arr = []

  if (Array.isArray(raw)) {
    arr = raw
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      arr = Array.isArray(parsed) ? parsed : []
    } catch {
      arr = []
    }
  }

  return arr
    .map((ev) => ({
      date: String(ev?.date || "").slice(0, 10),
      title: String(ev?.title || "").trim(),
    }))
    .filter((ev) => ev.date && ev.title)
}

function normalizeHeroRow(row) {
  const safe = row || {}
  return {
    heroVfxUrl: String(safe.heroVfxUrl || safe.hero_vfx_url || ""),
    heroMediaUrl: String(safe.heroMediaUrl || safe.hero_media_url || ""),
    spotifyPlaylistUrl: String(safe.spotifyPlaylistUrl || safe.spotify_playlist_url || ""),
    calendarEvents: normalizeCalendarEvents(safe.calendarEvents || safe.home_calendar_json || []),
  }
}

async function readHeroSettings() {
  const { rows } = await db.query(
    `SELECT hero_vfx_url AS "heroVfxUrl",
            hero_media_url AS "heroMediaUrl",
            spotify_playlist_url AS "spotifyPlaylistUrl",
            home_calendar_json AS "calendarEvents"
     FROM hero_settings
     WHERE id = 1
     LIMIT 1`
  )

  if (rows[0]) return normalizeHeroRow(rows[0])

  const fallback = await db.query(
    `SELECT hero_vfx_url AS "heroVfxUrl",
            hero_media_url AS "heroMediaUrl",
            spotify_playlist_url AS "spotifyPlaylistUrl",
            home_calendar_json AS "calendarEvents"
     FROM hero_settings
     ORDER BY id ASC
     LIMIT 1`
  )

  return normalizeHeroRow(fallback.rows[0] || {})
}

// Public (frontend) can read hero/home settings
router.get("/hero", async (req, res) => {
  try {
    await ensureHeroSchema()
    const data = await readHeroSettings()
    res.json(data)
  } catch (e) {
    console.error("HERO GET ERROR:", e)
    res.status(500).json({
      error: "Failed to load hero settings",
      heroVfxUrl: "",
      heroMediaUrl: "",
      spotifyPlaylistUrl: "",
      calendarEvents: [],
    })
  }
})

// Admin update hero/home settings
router.put("/admin/hero", auth, async (req, res) => {
  try {
    const email = req.user?.email
    if (!email) return res.status(401).json({ error: "Unauthorized" })
    if (!isAdmin(email)) return res.status(403).json({ error: "Admin access required" })

    await ensureHeroSchema()

    const heroVfxUrl = String(req.body?.heroVfxUrl || "").trim()
    const heroMediaUrl = String(req.body?.heroMediaUrl || "").trim()
    const spotifyPlaylistUrl = String(req.body?.spotifyPlaylistUrl || "").trim()
    const calendarEvents = normalizeCalendarEvents(req.body?.calendarEvents)

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

    const persisted = await readHeroSettings()
    res.json({ ok: true, ...persisted })
    } catch (e) {
    console.error("HERO PUT ERROR:", e)
    res.status(500).json({ error: "Failed to save hero" })
  }
})

module.exports = router
