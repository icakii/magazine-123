const express = require("express")
const router = express.Router()
const db = require("../db")

router.get("/leaderboards", async (req, res) => {
  try {
    const { rows } = await db.query(`
      WITH today AS (
        SELECT (now() AT TIME ZONE 'UTC')::date AS d
      ),
      base AS (
        SELECT
          u.email,
          u.display_name AS "displayName",
          COALESCE(u.wordle_streak, u.streak, 0) AS raw_streak,
          COALESCE(u.wordle_last_win_date, u.last_win_date) AS last_win,
          COALESCE(s.plan, 'free') AS plan
        FROM users u
        LEFT JOIN subscriptions s ON s.email = u.email
      )
      SELECT
        "displayName",
        plan,
        CASE
          WHEN last_win IS NULL THEN 0
          WHEN (SELECT d FROM today) - last_win > 1 THEN 0
          ELSE raw_streak
        END AS streak
      FROM base
      WHERE
        CASE
          WHEN last_win IS NULL THEN 0
          WHEN (SELECT d FROM today) - last_win > 1 THEN 0
          ELSE raw_streak
        END > 0
      ORDER BY streak DESC, "displayName" ASC
      LIMIT 50
    `)

    res.json(rows)
  } catch (e) {
    console.error("leaderboards error:", e)
    res.status(500).json({ error: "Failed to load leaderboard" })
  }
})

module.exports = router
