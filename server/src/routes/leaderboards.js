// server/src/routes/leaderboard.js
const express = require("express")
const router = express.Router()
const db = require("../db")

function utcYmd(date = new Date()) {
  return date.toISOString().slice(0, 10)
}
function ymdToDate(ymd) {
  return new Date(`${ymd}T00:00:00.000Z`)
}
function daysBetweenUtcYmd(a, b) {
  return Math.floor((ymdToDate(b) - ymdToDate(a)) / 86400000)
}
function effectiveStreak(raw, lastWin, today) {
  const s = Number(raw || 0)
  if (!lastWin || s <= 0) return 0
  const diff = daysBetweenUtcYmd(lastWin, today)
  return diff === 0 || diff === 1 ? s : 0
}

// GET /api/leaderboards
router.get("/leaderboards", async (req, res) => {
  try {
    const today = utcYmd()

    const { rows } = await db.query(`
      SELECT
        u.display_name AS "displayName",
        u.wordle_streak AS "rawStreak",
        u.wordle_last_win_date AS "lastWinDate",
        COALESCE(s.plan, 'free') AS "plan"
      FROM users u
      LEFT JOIN subscriptions s ON s.email = u.email
      WHERE u.is_confirmed = true
    `)

    const data = rows
      .map((r) => {
        const lastWin = r.lastWinDate
          ? String(r.lastWinDate).slice(0, 10)
          : null
        const eff = effectiveStreak(r.rawStreak, lastWin, today)

        return {
          displayName: r.displayName,
          plan: String(r.plan || "free").toLowerCase(),
          streak: eff,
          lastWinDate: lastWin,
        }
      })
      .filter((u) => u.streak > 0) // ❗ махаме всички 0
      .sort((a, b) => b.streak - a.streak)

    res.json(data.slice(0, 100))
  } catch (e) {
    console.error("LEADERBOARD ERROR:", e)
    res.status(500).json({ error: "Leaderboard failed" })
  }
})

module.exports = router
