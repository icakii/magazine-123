// server/src/routes/leaderboard.js
const express = require("express")
const router = express.Router()
const db = require("../db")

function utcYmd(date = new Date()) {
  return date.toISOString().slice(0, 10) // YYYY-MM-DD UTC
}
function ymdToDate(ymd) {
  return new Date(`${ymd}T00:00:00.000Z`)
}
function daysBetweenUtcYmd(aYmd, bYmd) {
  const a = ymdToDate(aYmd).getTime()
  const b = ymdToDate(bYmd).getTime()
  return Math.floor((b - a) / 86400000)
}
function effectiveStreak(rawStreak, lastWinYmd, todayYmd) {
  const s = Number(rawStreak || 0)
  if (!lastWinYmd || s <= 0) return 0
  const diff = daysBetweenUtcYmd(lastWinYmd, todayYmd)
  return diff === 0 || diff === 1 ? s : 0
}


// GET /api/leaderboards
router.get("/leaderboards", async (req, res) => {
  try {
    const today = utcYmd()

    const { rows } = await db.query(`
      SELECT
        u.display_name AS "displayName",
        COALESCE(u.wordle_streak, 0) AS "rawStreak",
        u.wordle_last_win_date AS "lastWinDate",
        COALESCE(s.plan, 'free') AS "plan"
      FROM users u
      LEFT JOIN subscriptions s ON s.email = u.email
      WHERE u.is_confirmed = true
      ORDER BY COALESCE(u.wordle_streak, 0) DESC, u.display_name ASC
      LIMIT 200
    `)

    const mapped = rows
  .map((r) => {
    const lastWin = r.lastWinDate ? String(r.lastWinDate).slice(0, 10) : null
    const raw = Number(r.rawStreak || 0)
    const eff = effectiveStreak(raw, lastWin, today)

    return {
      displayName: r.displayName,
      plan: String(r.plan || "free").toLowerCase(),
      streak: eff,
      lastWinDate: lastWin,
      rawStreak: raw, // TEMP debug (можеш да го махнеш после)
    }
  })
  .filter((u) => u.streak > 0)

// ✅ remove 0-streak users completely
      .sort((a, b) => b.streak - a.streak || a.displayName.localeCompare(b.displayName))
      .slice(0, 100)

    res.json(mapped)
  } catch (e) {
    console.error("LEADERBOARD ERROR:", e)
    res.status(500).json({ error: "Failed to load leaderboard" })
  }
})

module.exports = router
