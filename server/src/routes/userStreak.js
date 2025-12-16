const express = require("express")
const router = express.Router()

const { authMiddleware } = require("../middleware/auth.middleware")
const db = require("../db")

router.post("/user/streak", authMiddleware, async (req, res) => {
  try {
    const streak = Number(req.body.streak || 0)
    const lastWinISO = req.body.lastWinISO || null

    if (!Number.isFinite(streak) || streak < 0) {
      return res.status(400).json({ error: "Invalid streak value" })
    }

    // if win -> set win date (UTC date)
    // if streak == 0 -> do NOT overwrite last_win_date (optional), but we can keep it
    // For simplicity: if lastWinISO provided, use it; else use CURRENT_DATE.
    const winDateSql = lastWinISO ? "($2::date)" : "CURRENT_DATE"

    if (streak > 0) {
      await db.query(
        `
        UPDATE users
        SET
          wordle_streak = $1,
          wordle_last_win_date = ${winDateSql},
          wordle_last_played_date = CURRENT_DATE,

          -- ✅ compatibility columns (you have these in your DB)
          streak = $1,
          last_win_date = ${winDateSql}
        WHERE email = $3
        `,
        lastWinISO
          ? [streak, lastWinISO, req.user.email]
          : [streak, null, req.user.email]
      )
    } else {
      await db.query(
        `
        UPDATE users
        SET
          wordle_streak = 0,
          wordle_last_played_date = CURRENT_DATE,

          -- ✅ compatibility columns
          streak = 0
        WHERE email = $1
        `,
        [req.user.email]
      )
    }

    res.json({ ok: true })
  } catch (err) {
    console.error("User streak error:", err)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
