// server/src/routes/userStreak.js
const express = require("express")
const router = express.Router()
const db = require("../db")
const authMiddleware = require("../middleware/auth.middleware")

// ✅ protect ALL routes here
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
// Body: { reset:true } for reset OR empty body for "win"
router.post("/user/streak", async (req, res) => {
  const email = req.user?.email
  if (!email) return res.status(401).json({ error: "Unauthorized" })

  const today = utcTodayISO()
  const wantsReset = req.body?.reset === true || req.body?.streak === 0 || req.body?.streak === "0"

  const client = await db.connect()
  try {
    await client.query("BEGIN")

    const { rows } = await client.query(
      "SELECT wordle_streak, wordle_last_win_date FROM users WHERE email=$1 FOR UPDATE",
      [email]
    )
    const u = rows[0]
    if (!u) {
      await client.query("ROLLBACK")
      return res.status(404).json({ error: "User not found" })
    }

    const prevStreak = Number(u.wordle_streak || 0)
    const prevLastWin = u.wordle_last_win_date ? String(u.wordle_last_win_date).slice(0, 10) : null

    if (wantsReset) {
      await client.query(
        "UPDATE users SET wordle_streak=0, streak=0, wordle_last_win_date=NULL WHERE email=$1",
        [email]
      )
      await client.query("COMMIT")
      return res.json({ ok: true, streak: 0, effectiveStreak: 0, lastWinDate: null, today })
    }

    // ✅ WIN: idempotent 1 per UTC day
    if (prevLastWin) {
      const diff = daysDiff(prevLastWin, today)

      if (diff === 0) {
        await client.query("COMMIT")
        return res.json({
          ok: true,
          streak: prevStreak,
          effectiveStreak: effective(prevStreak, prevLastWin, today),
          lastWinDate: prevLastWin,
          today,
        })
      }

      const next = diff === 1 ? prevStreak + 1 : 1

      await client.query(
        "UPDATE users SET wordle_streak=$2, streak=$2, wordle_last_win_date=$3::date WHERE email=$1",
        [email, next, today]
      )
      await client.query("COMMIT")
      return res.json({ ok: true, streak: next, effectiveStreak: next, lastWinDate: today, today })
    } else {
      const next = 1
      await client.query(
        "UPDATE users SET wordle_streak=$2, streak=$2, wordle_last_win_date=$3::date WHERE email=$1",
        [email, next, today]
      )
      await client.query("COMMIT")
      return res.json({ ok: true, streak: next, effectiveStreak: next, lastWinDate: today, today })
    }
  } catch (e) {
    await client.query("ROLLBACK")
    console.error("POST STREAK ERROR:", e)
    return res.status(500).json({ error: "Failed to update streak" })
  } finally {
    client.release()
  }
})

module.exports = router
