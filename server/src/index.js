// ------------ server/index.js (ЦЕЛИЯТ ФАЙЛ) ------------

require('dotenv').config(); // <-- ВАЖНО: Добавено за локална работа
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto'); // <-- ВАЖНО: Добавено за токени
const db = require('./db'); 

const app = express();
// Прочита порта от .env, ако не го намери, ползва 8080, ако и той е зает, ползва 5000
const PORT = process.env.PORT || 8080; 
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: FRONTEND_URL, // Използва променливата от .env или Render
  credentials: true,
}));

// Auth Middleware
function authMiddleware(req, res, next) {
  const token = req.cookies['auth'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); } catch { return res.status(401).json({ error: 'Unauthorized' }); }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    const adminEmails = ["icaki06@gmail.com", "icaki2k@gmail.com"];
    if (!adminEmails.includes(req.user.email)) return res.status(403).json({ error: "Admin access required" });
    next();
  });
}

// Helper: Sign Token
function signToken(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }); }

// --- ROUTES ---

// 1. ARTICLES (Без промяна)
app.get("/api/articles", async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM articles';
    let params = [];
    if (category) {
        query += ' WHERE category = $1';
        params.push(category);
    }
    query += ' ORDER BY date DESC';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/articles", adminMiddleware, async (req, res) => {
  const { title, text, author, date, imageUrl, category, excerpt } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO articles (title, text, author, date, image_url, category, excerpt) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, text, author || "MIREN", date, imageUrl, category, excerpt]
    );
    res.json({ ok: true, article: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/articles/:id", adminMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM articles WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. MAGAZINE SETTINGS (Без промяна)
app.get("/api/magazine/status", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT value FROM settings WHERE key = 'magazine'");
    res.json(rows[0]?.value || { isPublic: false });
  } catch (err) { res.json({ isPublic: false }); }
});

app.post("/api/magazine/toggle", adminMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT value FROM settings WHERE key = 'magazine'");
    let current = rows[0]?.value || { isPublic: false };
    current.isPublic = !current.isPublic;
    
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('magazine', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [JSON.stringify(current)]
    );
    res.json({ ok: true, isPublic: current.isPublic });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. AUTH & USER

// Настройваме transporter-а (без промяна)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'icaki2k@gmail.com', pass: 'gbkm afqn ymsl rqhz' } // Увери се, че това е App Password
});


// ======== НОВА ПОПРАВКА 1: /api/auth/check (Поправя 404) ========
app.get("/api/auth/check", async (req, res) => {
  const { email, displayName } = req.query;
  try {
    let query = "SELECT 1 FROM users WHERE";
    let params = [];
    if (email) {
      query += " email = $1";
      params.push(email);
    } else if (displayName) {
      query += " display_name = $1";
      params.push(displayName);
    } else {
      return res.json({ taken: false }); // Ако няма query, казваме, че е свободно
    }
    const { rows } = await db.query(query, params);
    res.json({ taken: rows.length > 0 }); // true ако има редове, false ако няма
  } catch (err) {
    console.error("Auth check error:", err.message);
    res.json({ taken: false }); // При грешка, не блокираме формата
  }
});


// ======== НОВА ПОПРАВКА 2: /api/auth/register (Вече изпраща имейл) ========
app.post("/api/auth/register", async (req, res) => {
  const { email, password, displayName } = req.body;
  
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) return res.status(409).json({ error: "Email taken" });
    
    const nameCheck = await db.query('SELECT * FROM users WHERE display_name = $1', [displayName]);
    if (nameCheck.rows.length > 0) return res.status(409).json({ error: "Display name taken" });

    const hash = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex'); // Генерираме токен
    
    // Запазваме потребителя с токена в новите колони
    await db.query(
      'INSERT INTO users (email, display_name, password_hash, created_at, confirmation_token, is_confirmed) VALUES ($1, $2, $3, NOW(), $4, false)',
      [email, displayName, hash, token]
    );
    
    await db.query('INSERT INTO subscriptions (email, plan) VALUES ($1, $2)', [email, 'free']);
    
    // Създаваме URL за потвърждение
    const confirmationUrl = `${FRONTEND_URL}/confirm?token=${token}`;
    
    // Изпращаме имейла
    await transporter.sendMail({
      from: '"MIREN" <icaki2k@gmail.com>', // Твоят имейл
      to: email, // Имейлът на потребителя
      subject: 'Confirm your account for MIREN',
      html: `
        <p>Welcome to MIREN!</p>
        <p>Please click the link below to confirm your email address:</p>
        <a href="${confirmationUrl}" style="padding: 10px 15px; background-color: #e63946; color: white; text-decoration: none; border-radius: 5px;">
          Confirm Email
        </a>
        <br>
        <p>Or copy this link: ${confirmationUrl}</p>
      `
    });
    
    res.status(201).json({ ok: true, message: "Registration successful! Please check your email to confirm." });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: "Registration failed" }); 
  }
});


// ======== НОВА ПОПРАВКА 3: /api/auth/confirm (За да работи линкът от имейла) ========
app.post('/api/auth/confirm', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  try {
    // 1. Намираме потребителя по токен
    const { rows } = await db.query('SELECT * FROM users WHERE confirmation_token = $1', [token]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: "Invalid or expired token" });
    }

    // 2. Потвърждаваме го и чистим токена
    await db.query(
      'UPDATE users SET is_confirmed = true, confirmation_token = NULL WHERE email = $1',
      [user.email]
    );

    // 3. Логваме го автоматично
    const authToken = signToken({ email: user.email });
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth', authToken, { 
      httpOnly: true, 
      sameSite: isProduction ? 'none' : 'lax', 
      secure: isProduction 
    });
    
    res.json({ ok: true, message: "Email confirmed successfully!" });

  } catch (err) {
    console.error("Confirmation error:", err);
    res.status(500).json({ error: "Error confirming email" });
  }
});


// /api/auth/login (Модифициран да проверява дали имейлът е потвърден)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // ======== ПРОВЕРКА ЗА ПОТВЪРЖДЕНИЕ ========
    if (!user.is_confirmed) {
        return res.status(403).json({ error: 'Please confirm your email address first.' });
    }
    // ======================================
    
    const token = signToken({ email: user.email });
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth', token, { httpOnly: true, sameSite: isProduction ? 'none' : 'lax', secure: isProduction });
    
    res.json({ ok: true, user: { email: user.email, displayName: user.display_name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// /api/auth/logout (Без промяна)
app.post('/api/auth/logout', (req, res) => { 
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('auth', { httpOnly: true, sameSite: isProduction ? 'none' : 'lax', secure: isProduction });
    res.json({ ok: true }); 
});

// /api/user/me (Без промяна)
app.get('/api/user/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT email, display_name, last_username_change FROM users WHERE email = $1', [req.user.email]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = rows[0];
    res.json({ 
        email: user.email, 
        displayName: user.display_name, 
        lastUsernameChange: user.last_username_change 
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Subscriptions (Без промяна)
app.get('/api/subscriptions', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT plan FROM subscriptions WHERE email = $1 ORDER BY id DESC LIMIT 1', [req.user.email]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update Username (Без промяна)
app.post('/api/user/update-username', authMiddleware, async (req, res) => {
    const { newUsername } = req.body;
    const email = req.user.email;
    
    try {
        const subRes = await db.query('SELECT plan FROM subscriptions WHERE email = $1 ORDER BY id DESC LIMIT 1', [email]);
        const plan = subRes.rows[0]?.plan?.toLowerCase() || 'free';
        
        if (plan !== 'monthly' && plan !== 'yearly') {
            return res.status(403).json({ error: "Premium only feature" });
        }

        const userRes = await db.query('SELECT last_username_change FROM users WHERE email = $1', [email]);
        const lastChange = userRes.rows[0]?.last_username_change;
        
        if (lastChange) {
            const diffDays = Math.ceil(Math.abs(new Date() - new Date(lastChange)) / (1000 * 60 * 60 * 24));
            if (diffDays < 14) return res.status(403).json({ error: `Wait ${14 - diffDays} more days` });
        }

        await db.query('UPDATE users SET display_name = $1, last_username_change = NOW() WHERE email = $2', [newUsername, email]);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Streak (Без промяна)
app.post('/api/user/streak', authMiddleware, async (req, res) => {
    try {
        await db.query('UPDATE users SET wordle_streak = $1 WHERE email = $2', [req.body.streak, req.user.email]);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Старт на сървъра
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));