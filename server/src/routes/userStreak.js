// server/src/routes/userStreak.js
const express = require("express")
const db = require("../db")

function utcYmd(date = new Date()) {
  return date.toISOString().slice(0, 10) // YYYY-MM-DD UTC
}
function ymdToUTCDate(ymd) {
  return new Date(`${ymd}T00:00:00.000Z`)
}
function daysDiff(aYmd, bYmd) {
  const a = ymdToUTCDate(aYmd).getTime()
  const b = ymdToUTCDate(bYmd).getTime()
  return Math.floor((b - a) / 86400000)
}
function effectiveStreak(rawStreak, lastWinYmd, todayYmd) {
  const s = Number(rawStreak || 0)
  if (!lastWinYmd || s <= 0) return 0
  const diff = daysDiff(lastWinYmd, todayYmd)
  return diff === 0 || diff === 1 ? s : 0
}

// ✅ export factory so we can inject middlewares from index.js
module.exports = function createUserStreakRouter(authMiddleware, adminMiddleware) {
  const router = express.Router()

  // GET /api/user/streak (protected)
  router.get("/user/streak", authMiddleware, async (req, res) => {
    try {
      const email = req.user?.email
      if (!email) return res.status(401).json({ error: "Unauthorized" })

      const today = utcYmd()

      const { rows } = await db.query(
        "SELECT wordle_streak, wordle_last_win_date FROM users WHERE email=$1",
        [email]
      )
      const u = rows[0]
      if (!u) return res.status(404).json({ error: "User not found" })

      const lastWin = u.wordle_last_win_date
        ? String(u.wordle_last_win_date).slice(0, 10)
        : null

      const streak = Number(u.wordle_streak || 0)
      const eff = effectiveStreak(streak, lastWin, today)

      return res.json({
        streak,
        effectiveStreak: eff,
        lastWinDate: lastWin,
        today,
      })
    } catch (e) {
      console.error("GET STREAK ERROR:", e)
      return res.status(500).json({ error: "Failed to load streak" })
    }
  })

  // POST /api/user/streak (protected)
  // Body:
  //  - { type: "win" }  (default)
  //  - { type: "reset" }
  router.post("/user/streak", authMiddleware, async (req, res) => {
    const email = req.user?.email
    if (!email) return res.status(401).json({ error: "Unauthorized" })

    const type = String(req.body?.type || "win").toLowerCase()
    const today = utcYmd()

    const client = await db.connect()
    try {
      await client.query("BEGIN")

      // lock row to stop multi-device double increment
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
      const prevLastWin = u.wordle_last_win_date
        ? String(u.wordle_last_win_date).slice(0, 10)
        : null

      if (type === "reset") {
        await client.query(
          "UPDATE users SET wordle_streak=0, wordle_last_win_date=NULL, streak=0 WHERE email=$1",
          [email]
        )
        await client.query("COMMIT")
        return res.json({
          ok: true,
          streak: 0,
          effectiveStreak: 0,
          lastWinDate: null,
          today,
        })
      }

      // default = win (idempotent once per UTC day)
      if (prevLastWin) {
        const diff = daysDiff(prevLastWin, today)

        if (diff === 0) {
          // already counted today
          const eff = effectiveStreak(prevStreak, prevLastWin, today)
          await client.query("COMMIT")
          return res.json({
            ok: true,
            streak: prevStreak,
            effectiveStreak: eff,
            lastWinDate: prevLastWin,
            today,
          })
        }

        const next = diff === 1 ? prevStreak + 1 : 1

        await client.query(
          "UPDATE users SET wordle_streak=$2, wordle_last_win_date=$3::date, streak=$2 WHERE email=$1",
          [email, next, today]
        )
        await client.query("COMMIT")
        return res.json({
          ok: true,
          streak: next,
          effectiveStreak: next,
          lastWinDate: today,
          today,
        })
      } else {
        const next = 1
        await client.query(
          "UPDATE users SET wordle_streak=$2, wordle_last_win_date=$3::date, streak=$2 WHERE email=$1",
          [email, next, today]
        )
        await client.query("COMMIT")
        return res.json({
          ok: true,
          streak: next,
          effectiveStreak: next,
          lastWinDate: today,
          today,
        })
      }
    } catch (e) {
      try {
        await client.query("ROLLBACK")
      } catch {}
      console.error("POST STREAK ERROR:", e)
      return res.status(500).json({ error: "Failed to update streak" })
    } finally {
      client.release()
    }
  })

  // ✅ HARD RESET ALL (admin only)
  router.post("/admin/reset-streaks", adminMiddleware, async (req, res) => {
    try {
      await db.query(
        "UPDATE users SET wordle_streak=0, wordle_last_win_date=NULL, streak=0"
      )
      return res.json({ ok: true })
    } catch (e) {
      console.error("RESET ALL STREAKS ERROR:", e)
      return res.status(500).json({ error: "Failed to reset streaks" })
    }
  })

  return router
}
