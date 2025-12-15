// server/src/routes/userStreak.js
const express = require("express")
const router = express.Router()

const { authMiddleware } = require("../middleware/auth.middleware")
const db = require("../db")

/**
 * Очаква:
 * { streak: number, lastWinISO?: "YYYY-MM-DD" }
 *
 * lastWinISO е важно за leaderboard reset-а.
 */
router.post("/user/streak", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    const { streak, lastWinISO } = req.body

    if (typeof streak !== "number" || !Number.isFinite(streak) || streak < 0) {
      return res.status(400).json({ error: "Invalid streak value" })
    }

    // ако имаме дата на win, я записваме като last_win_date
    // ако нямаме, само update на streak
    if (lastWinISO) {
      await db.query(
        `
        UPDATE users
        SET wordle_streak = $1,
            last_win_date = $2::date
        WHERE id = $3
        `,
        [streak, lastWinISO, userId]
      )
    } else {
      await db.query(
        `
        UPDATE users
        SET wordle_streak = $1
        WHERE id = $2
        `,
        [streak, userId]
      )
    }

    return res.json({ success: true })
  } catch (err) {
    console.error("User streak error:", err)
    return res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
