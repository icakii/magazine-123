// server/src/middleware/auth.middleware.js
const jwt = require("jsonwebtoken")

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

module.exports = function authMiddleware(req, res, next) {
  let token = req.cookies?.auth

  // allow Bearer token (mobile / Safari)
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ")
    if (parts.length === 2 && parts[0] === "Bearer") token = parts[1]
  }

  if (!token) return res.status(401).json({ error: "Unauthorized" })

  try {
    // ✅ THIS is what you are missing:
    req.user = jwt.verify(token, JWT_SECRET)
    return next()
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" })
  }
}
