import express from "express"

// TODO: replace with your db client import
import { pool } from "../db/pool.js"

const router = express.Router()

/**
 * GET /leaderboards
 * Returns players with effectiveStreak:
 * - if last_win_date is NULL => 0
 * - if (todayUTC - last_win_date) > 1 => 0
 * - else => streak
 */
router.get("/leaderboards", async (_req, res) => {
  try {
    const q = `
      WITH today AS (
        SELECT (now() AT TIME ZONE 'UTC')::date AS d
      )
      SELECT
        u.id,
        u.display_name AS "displayName",
        u.streak AS "storedStreak",
        u.last_win_date AS "lastWinDate",
        CASE
          WHEN u.last_win_date IS NULL THEN 0
          WHEN (SELECT d FROM today) - u.last_win_date > 1 THEN 0
          ELSE u.streak
        END AS "effectiveStreak"
      FROM users u
      ORDER BY "effectiveStreak" DESC, u.display_name ASC
      LIMIT 100
    `
    const r = await pool.query(q)
    res.json(r.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "Server error" })
  }
})

export default router
