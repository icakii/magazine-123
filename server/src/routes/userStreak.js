import express from "express"
import { todayUTCDate } from "../utils/utc.js"

// TODO: replace with your db client import
// Example: import { pool } from "../db/pool.js"
import { pool } from "../db/pool.js"

// TODO: replace with your auth middleware
import { requireAuth } from "../middleware/requireAuth.js"

const router = express.Router()

/**
 * POST /user/streak
 * body: { streak: number, lastWinISO?: "YYYY-MM-DD" }
 *
 * - On win: send { streak, lastWinISO: todayUTC }
 * - On reset: send { streak: 0 } (lastWinISO can be omitted)
 */
router.post("/user/streak", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const streak = Number(req.body?.streak)

    if (!Number.isFinite(streak) || streak < 0) {
      return res.status(400).json({ error: "Invalid streak" })
    }

    const lastWinISO = req.body?.lastWinISO || null

    // Optional: if lastWinISO is provided, validate basic format YYYY-MM-DD
    if (lastWinISO && !/^\d{4}-\d{2}-\d{2}$/.test(lastWinISO)) {
      return res.status(400).json({ error: "Invalid lastWinISO format" })
    }

    // If client sends lastWinISO, allow only todayUTC (prevents cheating)
    if (lastWinISO) {
      const today = todayUTCDate()
      if (lastWinISO !== today) {
        return res.status(400).json({ error: "lastWinISO must be today's UTC date" })
      }
    }

    // Update streak + last_win_date (only set last_win_date if lastWinISO provided)
    const q = `
      UPDATE users
      SET
        streak = $1,
        last_win_date = COALESCE($2::date, last_win_date)
      WHERE id = $3
      RETURNING id, streak, last_win_date
    `
    const r = await pool.query(q, [streak, lastWinISO, userId])
    return res.json({ ok: true, user: r.rows[0] })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "Server error" })
  }
})

export default router
    