const express = require("express")
const router = express.Router()
const db = require("../db")

function utcTodayISO() {
  return new Date().toISOString().slice(0, 10)
}
function ymdToUTCDate(ymd) {
  return new Date(`${ymd}T00:00:00.000Z`)
}
function daysDiff(aYmd, bYmd) {
  return Math.floor((ymdToUTCDate(bYmd) - ymdToUTCDate(aYmd)) / 86400000)
}
function effective(streak, lastWinYmd, todayYmd) {
  if (!lastWinYmd) return 0
  const diff = daysDiff(lastWinYmd, todayYmd)
  return diff <= 1 ? Math.max(0, Number(streak || 0)) : 0
}

router.get("/leaderboards", async (req, res) => {
  try {
    const today = utcTodayISO()

    const { rows } = await db.query(`
      SELECT
        display_name AS "displayName",
        COALESCE(wordle_streak,0) AS "wordleStreak",
        wordle_last_win_date AS "lastWinDate"
      FROM users
      WHERE is_confirmed = true
      ORDER BY COALESCE(wordle_streak,0) DESC, display_name ASC
      LIMIT 50
    `)

    res.json(
      rows.map((r) => {
        const lastWin = r.lastWinDate ? String(r.lastWinDate).slice(0, 10) : null
        const streak = Number(r.wordleStreak || 0)
        return {
          displayName: r.displayName,
          streak, // raw
          effectiveStreak: effective(streak, lastWin, today),
          lastWinDate: lastWin,
        }
      })
    )
  } catch (e) {
    console.error("LEADERBOARDS ERROR:", e)
    res.status(500).json({ error: "Failed to load leaderboards" })
  }
})

module.exports = router
