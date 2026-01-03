import jwt from "jsonwebtoken"

export default function auth(req, res, next) {
  try {
    const header = req.headers.authorization || ""
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : ""
    const cookieToken = req.cookies?.token || ""
    const token = bearer || cookieToken

    if (!token) return res.status(401).json({ error: "Unauthorized" })

    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    return next()
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" })
  }
}
