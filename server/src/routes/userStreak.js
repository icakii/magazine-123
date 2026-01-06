// server/src/routes/userStreak.js
const express = require("express")
const db = require("../db")
const authMiddleware = require("../middleware/auth.middleware")

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

/**
 * Factory router:
 * index.js ще подаде sendGameStreakEndedEmail()
 */
module.exports = function makeUserStreakRouter({ sendGameStreakEndedEmail } = {}) {
  const router = express.Router()

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

      const lastWin = u.wordle_last_win_date
        ? String(u.wordle_last_win_date).slice(0, 10)
        : null
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
      const prevLastWin = u.wordle_last_win_date
        ? String(u.wordle_last_win_date).slice(0, 10)
        : null

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

        // already counted today
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
      return res.status(500).json({ error: "Failed to update streak" })
    } finally {
      client.release()
    }
  })

  // POST /api/user/streak/check-and-notify
  // Body: { gameKey?: "wordle" } (по желание)
  //
  // Логика:
  // - ако raw>0 и effective==0 => streak е "ended"
  // - reset-ва streak-а в DB
  // - праща email (ако sendGameStreakEndedEmail е подадена от index.js)
  router.post("/user/streak/check-and-notify", authMiddleware, async (req, res) => {
    try {
      const email = req.user?.email
      if (!email) return res.status(401).json({ error: "Unauthorized" })

      const gameKey = String(req.body?.gameKey || "wordle").toLowerCase()
      const today = utcTodayISO()

      const { rows } = await db.query(
        "SELECT wordle_streak, wordle_last_win_date FROM users WHERE email=$1",
        [email]
      )
      const u = rows[0]
      if (!u) return res.status(404).json({ error: "User not found" })

      const lastWin = u.wordle_last_win_date
        ? String(u.wordle_last_win_date).slice(0, 10)
        : null
      const raw = Number(u.wordle_streak || 0)
      const eff = effective(raw, lastWin, today)

      const ended = raw > 0 && eff === 0

      // Ако е ended: reset + email
      if (ended) {
        await db.query(
          `UPDATE users
           SET wordle_streak=0,
               streak=0,
               wordle_last_win_date=NULL
           WHERE email=$1`,
          [email]
        )

        // send email (ако е подадена функцията от index.js)
        if (typeof sendGameStreakEndedEmail === "function") {
          try {
            await sendGameStreakEndedEmail({
              to: email,
              gameKey,
              streak: raw,
            })
          } catch (mailErr) {
            console.error("STREAK ENDED EMAIL ERROR:", mailErr)
          }
        }
      }

      return res.json({
        ok: true,
        gameKey,
        ended,
        previousStreak: raw,
        streak: ended ? 0 : raw, // след reset вече е 0
        effectiveStreak: ended ? 0 : eff,
        lastWinDate: ended ? null : lastWin,
        today,
      })
    } catch (e) {
      console.error("CHECK AND NOTIFY ERROR:", e)
      return res.status(500).json({ error: "Failed" })
    }
  })

  return router
}
