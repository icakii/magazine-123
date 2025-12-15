const express = require("express")
const router = express.Router()
const { authMiddleware } = require("../middleware/auth.middleware")
const db = require("../db")

router.post("/user/streak", authMiddleware, async (req, res) => {
  try {
    const { streak } = req.body
    const email = req.user.email

    if (typeof streak !== "number") {
      return res.status(400).json({ error: "Invalid streak" })
    }

    await db.query(
      `
      UPDATE users
      SET wordle_streak = $1,
          last_win_date = (now() AT TIME ZONE 'UTC')::date
      WHERE email = $2
      `,
      [streak, email]
    )

    res.json({ ok: true })
  } catch (err) {
    console.error("user streak error:", err)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
