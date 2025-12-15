// server/src/routes/leaderboards.js
const express = require("express")
const router = express.Router()
const db = require("../db")

/**
 * GET /api/leaderboards
 * - streak се ресетва виртуално ако last_win_date не е вчера/днес (UTC)
 * - връща plan (free/monthly/yearly) от subscriptions.email
 * - НЕ връща редове със streak=0
 */
router.get("/leaderboards", async (req, res) => {
  try {
    const { rows } = await db.query(`
      WITH today AS (
        SELECT (now() AT TIME ZONE 'UTC')::date AS d
      ),
      computed AS (
        SELECT
          u.display_name AS "displayName",
          COALESCE(LOWER(s.plan), 'free') AS plan,
          CASE
            WHEN u.last_win_date IS NULL THEN 0
            WHEN (SELECT d FROM today) - u.last_win_date > 1 THEN 0
            ELSE COALESCE(u.wordle_streak, 0)
          END AS streak
        FROM users u
        LEFT JOIN subscriptions s
          ON s.email = u.email
      )
      SELECT "displayName", plan, streak
      FROM computed
      WHERE streak > 0
      ORDER BY streak DESC, "displayName" ASC
      LIMIT 50;
    `)

    res.json(rows)
  } catch (err) {
    console.error("leaderboards error:", err)
    res.status(500).json({ error: "Failed to load leaderboards" })
  }
})

module.exports = router
