const express = require("express")
const router = express.Router()

// 🔥 ВАЖНО: destructuring
const { authMiddleware } = require("../middleware/auth.middleware")

const pool = require("../db") // или ../db.js / ../db/index.js – както е при теб

router.post("/user/streak", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    const { streak } = req.body

    if (typeof streak !== "number") {
      return res.status(400).json({ error: "Invalid streak value" })
    }

    await pool.query(
      "UPDATE users SET streak = $1, last_streak_update = NOW() WHERE id = $2",
      [streak, userId]
    )

    res.json({ success: true })
  } catch (err) {
    console.error("User streak error:", err)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
