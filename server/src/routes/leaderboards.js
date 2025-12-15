const express = require("express")
const router = express.Router()
const db = require("../db")

router.get("/leaderboards", async (req, res) => {
  try {
    const { rows } = await db.query(`
      WITH today AS (
        SELECT (now() AT TIME ZONE 'UTC')::date AS d
      )
      SELECT
        u.display_name AS "displayName",
        CASE
          WHEN u.last_win_date IS NULL THEN 0
          WHEN (SELECT d FROM today) - u.last_win_date > 1 THEN 0
          ELSE u.wordle_streak
        END AS streak
      FROM users u
      ORDER BY streak DESC
      LIMIT 50
    `)

    res.json(rows)
  } catch (err) {
    console.error("leaderboard error:", err)
    res.status(500).json({ error: "Failed to load leaderboard" })
  }
})

module.exports = router
