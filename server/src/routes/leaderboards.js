const express = require("express")
const router = express.Router()

const db = require("../db")

// GET /api/leaderboards
router.get("/leaderboards", async (req, res) => {
  try {
    // IMPORTANT:
    // - wordle_streak: int
    // - wordle_last_win_date: date (UTC)
    // - subscriptions.plan: text
    // Show ONLY users with active streak > 0

    const { rows } = await db.query(`
      WITH today AS (
        SELECT (now() AT TIME ZONE 'UTC')::date AS d
      )
      SELECT
        u.display_name AS "displayName",
        COALESCE(s.plan, 'free') AS plan,
        CASE
          WHEN u.wordle_last_win_date IS NULL THEN 0
          WHEN (SELECT d FROM today) - u.wordle_last_win_date > 1 THEN 0
          ELSE COALESCE(u.wordle_streak, 0)
        END AS streak
      FROM users u
      LEFT JOIN subscriptions s ON s.email = u.email
      WHERE
        CASE
          WHEN u.wordle_last_win_date IS NULL THEN 0
          WHEN (SELECT d FROM today) - u.wordle_last_win_date > 1 THEN 0
          ELSE COALESCE(u.wordle_streak, 0)
        END > 0
      ORDER BY streak DESC, u.display_name ASC
      LIMIT 50
    `)

    res.json(rows)
  } catch (err) {
    console.error("LEADERBOARDS ERROR:", err)
    res.status(500).json({
      error: "Failed to load leaderboards",
      detail: err?.message || String(err),
    })
  }
})

module.exports = router
