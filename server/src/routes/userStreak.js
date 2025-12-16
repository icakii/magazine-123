const express = require("express")
const router = express.Router()

const db = require("../db")

// --- date helpers (UTC, day-level) ---
function utcTodayISO() {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function isoToDayNumber(isoYYYYMMDD) {
  if (!isoYYYYMMDD || typeof isoYYYYMMDD !== "string") return null
  const m = isoYYYYMMDD.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const ms = Date.UTC(y, mo - 1, d)
  return Math.floor(ms / 86400000)
}

function ensureYYYYMMDD(v) {
  if (typeof v !== "string") return null
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

// IMPORTANT:
// - users.wordle_streak: int
// - users.wordle_last_win_date: date (UTC)
//
// This endpoint must be idempotent across devices:
// - Winning twice in the same UTC day must NOT increase streak.

// GET /api/user/streak
router.get("/user/streak", async (req, res) => {
  try {
    const email = req.user?.email
    if (!email) return res.status(401).json({ error: "Unauthorized" })

    const { rows } = await db.query(
      "SELECT wordle_streak, wordle_last_win_date FROM users WHERE email = $1",
      [email]
    )
    const u = rows[0]
    const todayISO = utcTodayISO()
    const todayN = isoToDayNumber(todayISO)

    const lastISO = u?.wordle_last_win_date
      ? String(u.wordle_last_win_date).slice(0, 10)
      : null
    const lastN = lastISO ? isoToDayNumber(lastISO) : null
    const raw = Number(u?.wordle_streak || 0)

    const effectiveStreak =
      !lastN ? 0 : todayN - lastN > 1 ? 0 : Math.max(0, raw)

    res.json({
      streak: raw,
      effectiveStreak,
      lastWinDate: lastISO,
      todayISO,
    })
  } catch (err) {
    console.error("USER STREAK GET ERROR:", err)
    res.status(500).json({ error: "Failed to load streak" })
  }
})

// POST /api/user/streak
// Body:
// - { lastWinISO: "YYYY-MM-DD" }  -> register a win for that day
// - { streak: 0 }                  -> reset streak
router.post("/user/streak", async (req, res) => {
  const email = req.user?.email
  if (!email) return res.status(401).json({ error: "Unauthorized" })

  const requestedReset = Number(req.body?.streak) === 0
  const requestedWinISO = ensureYYYYMMDD(req.body?.lastWinISO) || utcTodayISO()

  const client = await db.connect()
  try {
    await client.query("BEGIN")

    const { rows } = await client.query(
      "SELECT wordle_streak, wordle_last_win_date FROM users WHERE email = $1 FOR UPDATE",
      [email]
    )
    const u = rows[0]
    if (!u) {
      await client.query("ROLLBACK")
      return res.status(404).json({ error: "User not found" })
    }

    if (requestedReset) {
      await client.query(
        "UPDATE users SET wordle_streak = 0, wordle_last_win_date = NULL WHERE email = $1",
        [email]
      )
      await client.query("COMMIT")
      return res.json({ ok: true, streak: 0, effectiveStreak: 0, lastWinDate: null })
    }

    const todayISO = requestedWinISO
    const todayN = isoToDayNumber(todayISO)

    const prevLastISO = u.wordle_last_win_date
      ? String(u.wordle_last_win_date).slice(0, 10)
      : null
    const prevLastN = prevLastISO ? isoToDayNumber(prevLastISO) : null

    const prevStreak = Number(u.wordle_streak || 0)

    let nextStreak = 1

    if (prevLastN != null) {
      const diff = todayN - prevLastN
      if (diff === 0) {
        // already counted today (multi-device safe)
        nextStreak = Math.max(0, prevStreak)
      } else if (diff === 1) {
        nextStreak = Math.max(0, prevStreak) + 1
      } else {
        nextStreak = 1
      }
    }

    await client.query(
      "UPDATE users SET wordle_streak = $1, wordle_last_win_date = $2::date WHERE email = $3",
      [nextStreak, todayISO, email]
    )

    await client.query("COMMIT")

    res.json({
      ok: true,
      streak: nextStreak,
      effectiveStreak: nextStreak,
      lastWinDate: todayISO,
    })
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("USER STREAK POST ERROR:", err)
    res.status(500).json({ error: "Failed to update streak" })
  } finally {
    client.release()
  }
})

module.exports = router
