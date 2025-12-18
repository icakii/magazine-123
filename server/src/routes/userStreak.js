// server/src/routes/userStreak.js
const express = require("express")
const router = express.Router()
const db = require("../db")
const authMiddleware = require("../middleware/auth.middleware")

router.use(authMiddleware)

function utcTodayISO() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD UTC
}
function ymdToUTCDate(ymd) {
  return new Date(`${ymd}T00:00:00.000Z`)
}
function daysDiff(aYmd, bYmd) {
  const a = ymdToUTCDate(aYmd).getTime()
  const b = ymdToUTCDate(bYmd).getTime()
  return Math.floor((b - a) / 86400000)
}
function effective(streak, lastWinYmd, todayYmd) {
  if (!lastWinYmd) return 0
  const diff = daysDiff(lastWinYmd, todayYmd)
  return diff <= 1 ? Math.max(0, Number(streak || 0)) : 0
}

// GET /api/user/streak
router.get("/user/streak", async (req, res) => {
  try {
    const email = req.user?.email
    if (!email) return res.status(401).json({ error: "Unauthorized" })

    const today = utcTodayISO()
    const { rows } = await db.query(
      "SELECT wordle_streak, wordle_last_win_date FROM users WHERE email=$1",
      [email]
    )
    const u = rows[0]
    if (!u) return res.status(404).json({ error: "User not found" })

    const lastWin = u.wordle_last_win_date ? String(u.wordle_last_win_date).slice(0, 10) : null
    const raw = Number(u.wordle_streak || 0)

    return res.json({
      streak: raw,
      effectiveStreak: effective(raw, lastWin, today),
      lastWinDate: lastWin,
      today,
    })
  } catch (e) {
    console.error("GET STREAK ERROR:", e)
    return res.status(500).json({ error: "Failed to load streak" })
  }
})

// POST /api/user/streak
// Body: { reset:true } OR empty body for "win"
router.post("/user/streak", async (req, res) => {
  try {
    const email = req.user?.email
    if (!email) return res.status(401).json({ error: "Unauthorized" })

    const today = utcTodayISO()
    const wantsReset = req.body?.reset === true || req.body?.streak === 0 || req.body?.streak === "0"

    if (wantsReset) {
      const { rows } = await db.query(
        "UPDATE users SET wordle_streak=0, streak=0, wordle_last_win_date=NULL WHERE email=$1 RETURNING wordle_streak, wordle_last_win_date",
        [email]
      )
      return res.json({ ok: true, streak: 0, effectiveStreak: 0, lastWinDate: null, today })
    }

    // ✅ Atomic, safe, 1 win per UTC day
    // - if already won today -> unchanged
    // - if last win was yesterday -> +1
    // - else -> 1
    const { rows } = await db.query(
      `
      UPDATE users
      SET
        wordle_streak = CASE
          WHEN wordle_last_win_date = $2::date THEN wordle_streak
          WHEN wordle_last_win_date = ($2::date - INTERVAL '1 day') THEN COALESCE(wordle_streak, 0) + 1
          ELSE 1
        END,
        streak = CASE
          WHEN wordle_last_win_date = $2::date THEN streak
          WHEN wordle_last_win_date = ($2::date - INTERVAL '1 day') THEN COALESCE(wordle_streak, 0) + 1
          ELSE 1
        END,
        wordle_last_win_date = CASE
          WHEN wordle_last_win_date = $2::date THEN wordle_last_win_date
          ELSE $2::date
        END
      WHERE email = $1
      RETURNING wordle_streak, wordle_last_win_date
      `,
      [email, today]
    )

    const u = rows[0]
    if (!u) return res.status(404).json({ error: "User not found" })

    const raw = Number(u.wordle_streak || 0)
    const lastWin = u.wordle_last_win_date ? String(u.wordle_last_win_date).slice(0, 10) : null

    return res.json({
      ok: true,
      streak: raw,
      effectiveStreak: raw, // just won today (or already counted today)
      lastWinDate: lastWin,
      today,
    })
  } catch (e) {
    console.error("POST STREAK ERROR:", e)
    return res.status(500).json({ error: "Failed to update streak" })
  }
})

module.exports = router
