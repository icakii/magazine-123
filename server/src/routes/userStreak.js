const express = require("express")
const router = express.Router()

// използваме ТВОЯ db wrapper
const db = require("../db")

// използваме ТВОЯ auth middleware
const authMiddleware = require("../middleware/auth.middleware") // <- ако е на друго място, кажи

function todayUTC() {
  const d = new Date()
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

/**
 * POST /api/user/streak
 * body: { streak: number, lastWinISO?: "YYYY-MM-DD" }
 */
router.post("/user/streak", authMiddleware, async (req, res) => {
  try {
    const { streak, lastWinISO } = req.body
    const email = req.user.email

    if (!Number.isInteger(streak) || streak < 0) {
      return res.status(400).json({ error: "Invalid streak" })
    }

    if (lastWinISO && lastWinISO !== todayUTC()) {
      return res.status(400).json({ error: "Invalid win date" })
    }

    await db.query(
      `
      UPDATE users
      SET
        wordle_streak = $1,
        last_win_date = COALESCE($2, last_win_date)
      WHERE email = $3
      `,
      [streak, lastWinISO || null, email]
    )

    res.json({ ok: true })
  } catch (e) {
    console.error("streak error:", e)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
