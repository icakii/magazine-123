const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')
const crypto = require('crypto')
const db = require('./db') // Изисква db.js да е в същата папка

const app = express()
const PORT = process.env.PORT || 8080
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Middleware
app.use(express.json())
app.use(cookieParser())
app.use(cors({ origin: FRONTEND_URL, credentials: true }))

// Auth Middleware
function authMiddleware(req, res, next) {
  const token = req.cookies['auth']
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try { req.user = jwt.verify(token, JWT_SECRET); next() } catch { return res.status(401).json({ error: 'Unauthorized' }) }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    const adminEmails = ["icaki06@gmail.com", "icaki2k@gmail.com"]
    if (!adminEmails.includes(req.user.email)) return res.status(403).json({ error: "Admin access required" })
    next()
  })
}

// Helper: Sign Token
function signToken(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }) }

// --- ROUTES ---

// 1. ARTICLES
app.get("/api/articles", async (req, res) => {
  try {
    const { category } = req.query
    let query = 'SELECT * FROM articles'
    let params = []
    if (category) {
        query += ' WHERE category = $1'
        params.push(category)
    }
    query += ' ORDER BY date DESC'
    const { rows } = await db.query(query, params)
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post("/api/articles", adminMiddleware, async (req, res) => {
  const { title, text, author, date, imageUrl, category, excerpt } = req.body
  try {
    const { rows } = await db.query(
      'INSERT INTO articles (title, text, author, date, image_url, category, excerpt) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, text, author || "MIREN", date, imageUrl, category, excerpt]
    )
    res.json({ ok: true, article: rows[0] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete("/api/articles/:id", adminMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM articles WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 2. MAGAZINE SETTINGS
app.get("/api/magazine/status", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT value FROM settings WHERE key = 'magazine'")
    res.json(rows[0]?.value || { isPublic: false })
  } catch (err) { res.json({ isPublic: false }) }
})

app.post("/api/magazine/toggle", adminMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT value FROM settings WHERE key = 'magazine'")
    let current = rows[0]?.value || { isPublic: false }
    current.isPublic = !current.isPublic
    
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('magazine', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [JSON.stringify(current)]
    )
    res.json({ ok: true, isPublic: current.isPublic })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 3. AUTH & USER
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'icaki2k@gmail.com', pass: 'gbkm afqn ymsl rqhz' }
})

app.post("/api/auth/register", async (req, res) => {
  const { email, password, displayName } = req.body
  try {
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email])
    if (userCheck.rows.length > 0) return res.status(409).json({ error: "Email taken" })
    
    const hash = await bcrypt.hash(password, 10)
    
    await db.query(
      'INSERT INTO users (email, display_name, password_hash, created_at) VALUES ($1, $2, $3, NOW())',
      [email, displayName, hash]
    )
    
    await db.query('INSERT INTO subscriptions (email, plan) VALUES ($1, $2)', [email, 'free'])
    
    res.json({ ok: true })
  } catch (err) { 
    console.error(err)
    res.status(500).json({ error: "Registration failed" }) 
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email])
    const user = rows[0]
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    const token = signToken({ email: user.email })
    const isProduction = process.env.NODE_ENV === 'production'
    res.cookie('auth', token, { httpOnly: true, sameSite: isProduction ? 'none' : 'lax', secure: isProduction })
    
    res.json({ ok: true, user: { email: user.email, displayName: user.display_name } })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/auth/logout', (req, res) => { 
    const isProduction = process.env.NODE_ENV === 'production'
    res.clearCookie('auth', { httpOnly: true, sameSite: isProduction ? 'none' : 'lax', secure: isProduction })
    res.json({ ok: true }) 
})

app.get('/api/user/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT email, display_name, last_username_change FROM users WHERE email = $1', [req.user.email])
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' })
    
    const user = rows[0]
    res.json({ 
        email: user.email, 
        displayName: user.display_name, 
        lastUsernameChange: user.last_username_change 
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Subscriptions
app.get('/api/subscriptions', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT plan FROM subscriptions WHERE email = $1 ORDER BY id DESC LIMIT 1', [req.user.email])
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Update Username
app.post('/api/user/update-username', authMiddleware, async (req, res) => {
    const { newUsername } = req.body
    const email = req.user.email
    
    try {
        // 1. Proverka za plan
        const subRes = await db.query('SELECT plan FROM subscriptions WHERE email = $1 ORDER BY id DESC LIMIT 1', [email])
        const plan = subRes.rows[0]?.plan?.toLowerCase() || 'free'
        
        if (plan !== 'monthly' && plan !== 'yearly') {
            return res.status(403).json({ error: "Premium only feature" })
        }

        // 2. Proverka za 14 dni
        const userRes = await db.query('SELECT last_username_change FROM users WHERE email = $1', [email])
        const lastChange = userRes.rows[0]?.last_username_change
        
        if (lastChange) {
            const diffDays = Math.ceil(Math.abs(new Date() - new Date(lastChange)) / (1000 * 60 * 60 * 24))
            if (diffDays < 14) return res.status(403).json({ error: `Wait ${14 - diffDays} more days` })
        }

        // 3. Update
        await db.query('UPDATE users SET display_name = $1, last_username_change = NOW() WHERE email = $2', [newUsername, email])
        res.json({ ok: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// Streak
app.post('/api/user/streak', authMiddleware, async (req, res) => {
    try {
        await db.query('UPDATE users SET wordle_streak = $1 WHERE email = $2', [req.body.streak, req.user.email])
        res.json({ ok: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

app.listen(PORT, () => console.log(`API running on port ${PORT}`))