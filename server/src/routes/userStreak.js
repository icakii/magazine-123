// server/src/routes/userStreak.js
const express = require("express")
const router = express.Router()
const db = require("../db")
const authMiddleware = require("../middleware/auth.middleware") // <-- важно

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
  const s = Number(streak || 0)
  if (!lastWinYmd || s <= 0) return 0
  const diff = daysDiff(lastWinYmd, todayYmd)
  return diff === 0 || diff === 1 ? s : 0
}

// GET /api/user/streak
router.get("/user/streak", authMiddleware, async (req, res) => {
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

    res.json({
      streak: raw,
      effectiveStreak: effective(raw, lastWin, today),
      lastWinDate: lastWin,
      today,
    })
  } catch (e) {
    console.error("GET STREAK ERROR:", e)
    res.status(500).json({ error: "Failed to load streak" })
  }
})

// POST /api/user/streak
// Body: { type: "win" } OR { type: "reset" }
router.post("/user/streak", authMiddleware, async (req, res) => {
  const email = req.user?.email
  if (!email) return res.status(401).json({ error: "Unauthorized" })

  const type = String(req.body?.type || "win").toLowerCase()
  const today = utcTodayISO()

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

    if (type === "reset") {
      await client.query(
        `UPDATE users
         SET wordle_streak=0,
             streak=0,
             wordle_last_win_date=NULL
         WHERE email=$1`,
        [email]
      )
      await client.query("COMMIT")
      return res.json({ ok: true, streak: 0, effectiveStreak: 0, lastWinDate: null, today })
    }

    // type === "win"
    // idempotent per UTC day
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
        `UPDATE users
         SET wordle_streak=$2,
             streak=$2,
             wordle_last_win_date=$3::date
         WHERE email=$1`,
        [email, next, today]
      )
      await client.query("COMMIT")
      return res.json({ ok: true, streak: next, effectiveStreak: next, lastWinDate: today, today })
    }

    // first win ever
    await client.query(
      `UPDATE users
       SET wordle_streak=1,
           streak=1,
           wordle_last_win_date=$2::date
       WHERE email=$1`,
      [email, today]
    )
    await client.query("COMMIT")
    return res.json({ ok: true, streak: 1, effectiveStreak: 1, lastWinDate: today, today })
  } catch (e) {
    await client.query("ROLLBACK")
    console.error("POST STREAK ERROR:", e)
    res.status(500).json({ error: "Failed to update streak" })
  } finally {
    client.release()
  }
})

module.exports = router
