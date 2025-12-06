// ================================================================
// SERVER/INDEX.JS - MIREN API (FULL VERSION)
// ================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = require('./db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// ---------------------------------------------------------------
// 1. CONFIG & BASE MIDDLEWARE
// ---------------------------------------------------------------
app.set('trust proxy', 1); // за Render

app.use(cookieParser());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

// Email Transporter (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ---------------------------------------------------------------
// 2. STRIPE WEBHOOK  (трябва да е ПРЕДИ express.json())
// ---------------------------------------------------------------
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details.email;

    if (session.payment_status === 'paid' && session.mode === 'subscription') {
      let plan = 'free';
      if (session.amount_total === 499) plan = 'monthly';
      if (session.amount_total === 4999) plan = 'yearly';

      try {
        await db.query(
          'UPDATE subscriptions SET plan = $1 WHERE email = $2',
          [plan, customerEmail]
        );
      } catch (dbErr) {
        console.error('DB UPDATE ERROR:', dbErr);
      }
    }
  }

  res.json({ received: true });
});

// ---------------------------------------------------------------
// 3. BODY PARSERS (след webhook-а)
// ---------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------
// 4. AUTH HELPERS
// ---------------------------------------------------------------
function authMiddleware(req, res, next) {
  let token = req.cookies['auth'];

  // allow Bearer token (mobile / Safari)
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
  }

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    const adminEmails = [
      "icaki06@gmail.com",
      "icaki2k@gmail.com",
      "mirenmagazine@gmail.com",
    ];
    if (!adminEmails.includes(req.user.email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// ================================================================
// API ROUTES
// ================================================================

// ---------------------------------------------------------------
// 🔧 MAGIC DB FIX ROUTE – ПУСНИ ГО ВЕДНЪЖ: /api/fix-db
// ---------------------------------------------------------------
app.get('/api/fix-db', async (req, res) => {
  try {
    // 1. Добавяме колоните за статиите (ако липсват)
    await db.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;`);
    await db.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS button_text TEXT;`);
    await db.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS link_to TEXT;`);
    await db.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS time TEXT;`);
    
    // 2. Създаваме таблицата за списанията
    await db.query(`
      CREATE TABLE IF NOT EXISTS magazine_issues (
          id SERIAL PRIMARY KEY,
          issue_number TEXT,
          month TEXT,
          year INTEGER,
          is_locked BOOLEAN DEFAULT TRUE,
          cover_url TEXT,
          pages JSONB,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 3. Създаваме таблицата за Newsletter
    await db.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    res.send("✅ УСПЕХ! Базата данни е поправена! Сега Error 500 трябва да изчезне.");
  } catch (e) {
    res.status(500).send("ГРЕШКА при поправка: " + e.message);
  }
});

// ---------------------------------------------------------------
// 📧 NEWSLETTER
// ---------------------------------------------------------------
app.post('/api/newsletter/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    await db.query(
      'INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [email]
    );
    res.json({ ok: true, message: "Subscribed!" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get('/api/newsletter/subscribers', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT email, created_at FROM newsletter_subscribers ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/newsletter/send', adminMiddleware, async (req, res) => {
  const { subject, body } = req.body;
  try {
    const { rows } = await db.query('SELECT email FROM newsletter_subscribers');
    if (rows.length === 0) {
      return res.status(400).json({ error: "No subscribers found" });
    }

    const emails = rows.map(r => r.email);

    await transporter.sendMail({
      from: `"MIREN Newsletter" <${process.env.EMAIL_USER}>`,
      bcc: emails,
      subject,
      html: body,
    });

    res.json({ ok: true, count: emails.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to send emails" });
  }
});

// ---------------------------------------------------------------
// 📚 MAGAZINES
// ---------------------------------------------------------------
app.get('/api/magazines', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM magazine_issues ORDER BY year DESC, month DESC'
    );
    const mapped = rows.map(row => ({
      id: row.id,
      issueNumber: row.issue_number,
      month: row.month,
      year: row.year,
      isLocked: row.is_locked,
      coverUrl: row.cover_url,
      pages: row.pages,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/magazines', adminMiddleware, async (req, res) => {
  const { issueNumber, month, year, isLocked, coverUrl, pages } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO magazine_issues
       (issue_number, month, year, is_locked, cover_url, pages)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [issueNumber, month, year, isLocked, coverUrl, JSON.stringify(pages)]
    );
    res.json({ ok: true, issue: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/magazines/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { issueNumber, month, year, isLocked, coverUrl, pages } = req.body;
  try {
    await db.query(
      `UPDATE magazine_issues
       SET issue_number=$1, month=$2, year=$3, is_locked=$4, cover_url=$5, pages=$6
       WHERE id=$7`,
      [issueNumber, month, year, isLocked, coverUrl, JSON.stringify(pages), id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/magazines/:id', adminMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM magazine_issues WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------
// 📰 ARTICLES (с buttonText + customLink)
// ---------------------------------------------------------------
// --- ARTICLES ---
app.get("/api/articles", async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM articles';
    const params = [];

    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }

    query += ' ORDER BY date DESC';

    const { rows } = await db.query(query, params);

    const mappedRows = rows.map(row => ({
      id: row.id,
      title: row.title,
      text: row.text,
      author: row.author,
      date: row.date,
      imageUrl: row.image_url,
      articleCategory: row.category,
      excerpt: row.excerpt,
      isPremium: row.is_premium,
      // 🔥 ВАЖНО: тук вече връщаме СЪЩИТЕ имена, които ползва фронтът
      buttonText: row.button_text || "Read More",
      customLink: row.link_to || "",
      time: row.time || null,
    }));

    res.json(mappedRows);
  } catch (err) {
    console.error("GET /api/articles error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/articles", adminMiddleware, async (req, res) => {
  const {
    title,
    text,
    author,
    date,
    imageUrl,
    category,
    excerpt,
    isPremium,
    buttonText,
    customLink,
    time,
  } = req.body;

  try {
    const { rows } = await db.query(
      `INSERT INTO articles 
       (title, text, author, date, image_url, category, excerpt, is_premium, button_text, link_to, time) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        title,
        text,
        author || "MIREN",
        date,
        imageUrl,
        category,
        excerpt,
        isPremium || false,
        buttonText || "Read More",
        customLink || null,
        time || null,
      ]
    );

    res.json({ ok: true, article: rows[0] });
  } catch (err) {
    console.error("POST /api/articles error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/articles/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const {
    title,
    text,
    author,
    date,
    imageUrl,
    category,
    excerpt,
    isPremium,
    buttonText,
    customLink,
    time,
  } = req.body;

  try {
    const result = await db.query(
      `UPDATE articles 
       SET title=$1,
           text=$2,
           author=$3,
           date=$4,
           image_url=$5,
           category=$6,
           excerpt=$7,
           is_premium=$8,
           button_text=$9,
           link_to=$10,
           time=$11
       WHERE id=$12
       RETURNING *`,
      [
        title,
        text,
        author,
        date,
        imageUrl,
        category,
        excerpt,
        isPremium || false,
        buttonText || "Read More",
        customLink || null,
        time || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Article not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /api/articles/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/articles/:id", adminMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM articles WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/articles/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});



// ---------------------------------------------------------------
// 🔐 AUTH ROUTES
// ---------------------------------------------------------------
app.post("/api/auth/register", async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const userCheck = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: "Email taken" });
    }

    const nameCheck = await db.query(
      'SELECT * FROM users WHERE display_name = $1',
      [displayName]
    );
    if (nameCheck.rows.length > 0) {
      return res.status(409).json({ error: "Display name taken" });
    }

    const hash = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');

    await db.query(
      'INSERT INTO users (email, display_name, password_hash, created_at, confirmation_token, is_confirmed) VALUES ($1,$2,$3,NOW(),$4,false)',
      [email, displayName, hash, token]
    );
    await db.query(
      'INSERT INTO subscriptions (email, plan) VALUES ($1,$2)',
      [email, 'free']
    );

    const confirmationUrl = `${APP_URL}/confirm?token=${token}`;
    await transporter.sendMail({
      from: '"MIREN" <mirenmagazine@gmail.com>',
      to: email,
      subject: 'Confirm Account',
      html: `<a href="${confirmationUrl}">Click to Confirm Email</a>`,
    });

    res.status(201).json({ ok: true, message: "Check email!" });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Wrong password' });

    if (!user.is_confirmed) {
      return res.status(403).json({ error: 'Confirm email first' });
    }

    if (user.two_fa_enabled) {
      return res.json({ ok: true, requires2fa: true });
    }

    const token = signToken({ email: user.email });
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('auth', token, {
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
    });

    res.json({
      ok: true,
      user: { email: user.email, displayName: user.display_name },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('auth', {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  });
  res.json({ ok: true });
});

app.post('/api/auth/confirm', async (req, res) => {
  const { token } = req.body;

  try {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE confirmation_token = $1',
      [token]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: "Invalid token" });
    }

    await db.query(
      'UPDATE users SET is_confirmed = true, confirmation_token = NULL WHERE email = $1',
      [rows[0].email]
    );

    const authToken = signToken({ email: rows[0].email });
    res.cookie('auth', authToken, { httpOnly: true });
    res.json({ ok: true, token: authToken });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.get('/api/user/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT email, display_name, last_username_change, two_fa_enabled FROM users WHERE email = $1',
      [req.user.email]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    res.json({
      email: rows[0].email,
      displayName: rows[0].display_name,
      twoFaEnabled: rows[0].two_fa_enabled,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- reset password ---
app.post('/api/auth/reset-password-request', async (req, res) => {
  const { email } = req.body;

  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1h

    await db.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
      [token, expiry, email]
    );

    const url = `${APP_URL}/reset-password?token=${token}`;
    await transporter.sendMail({
      to: email,
      subject: 'Reset Password',
      html: `<a href="${url}">Reset Here</a>`,
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error" });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [token]
    );
    if (!rows[0]) return res.status(400).json({ error: "Invalid token" });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE email = $2',
      [hash, rows[0].email]
    );

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error" });
  }
});

// --- 2FA ---
app.post('/api/auth/send-2fa', async (req, res) => {
  const { email } = req.body;

  try {
    const code = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      'UPDATE users SET two_fa_code = $1, two_fa_expiry = $2 WHERE email = $3',
      [code, expiry, email]
    );

    await transporter.sendMail({
      to: email,
      subject: '2FA Code',
      html: `Code: ${code}`,
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error" });
  }
});

app.post('/api/auth/verify-2fa', async (req, res) => {
  const { email, code } = req.body;

  try {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    if (
      user.two_fa_code !== code ||
      new Date() > new Date(user.two_fa_expiry)
    ) {
      return res.status(401).json({ error: "Invalid/Expired" });
    }

    await db.query(
      'UPDATE users SET two_fa_enabled = true, two_fa_code = NULL WHERE email = $1',
      [email]
    );

    const token = signToken({ email: user.email });
    res.cookie('auth', token, { httpOnly: true });
    res.json({ ok: true, token });
  } catch (e) {
    res.status(500).json({ error: "Error" });
  }
});

// ---------------------------------------------------------------
// 💳 SUBSCRIPTIONS & STRIPE CHECKOUT
// ---------------------------------------------------------------
app.get('/api/subscriptions', authMiddleware, async (req, res) => {
  const { rows } = await db.query(
    'SELECT plan FROM subscriptions WHERE email = $1',
    [req.user.email]
  );
  res.json(rows);
});

app.post('/api/create-checkout-session', authMiddleware, async (req, res) => {
  const { plan } = req.body;
  const userEmail = req.user.email;

  let priceData;
  if (plan === 'monthly') {
    priceData = {
      product_data: { name: 'Monthly' },
      unit_amount: 499,
      currency: 'eur',
      recurring: { interval: 'month' },
    };
  } else {
    priceData = {
      product_data: { name: 'Yearly' },
      unit_amount: 4999,
      currency: 'eur',
      recurring: { interval: 'year' },
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price_data: priceData, quantity: 1 }],
      customer_email: userEmail,
      success_url: `${APP_URL}/profile?payment_success=true`,
      cancel_url: `${APP_URL}/subscriptions`,
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------
// 🏆 LEADERBOARD + WORDLE STREAK
// ---------------------------------------------------------------
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        u.display_name AS "displayName",
        u.wordle_streak AS streak,
        COALESCE(s.plan, 'free') AS plan
      FROM users u
      LEFT JOIN subscriptions s ON s.email = u.email
      WHERE u.wordle_streak > 0
      ORDER BY u.wordle_streak DESC
      LIMIT 50
    `);

    res.json(rows);
  } catch (err) {
    console.error("LEADERBOARD ERROR:", err);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

app.post('/api/user/streak', authMiddleware, async (req, res) => {
  await db.query(
    'UPDATE users SET wordle_streak = $1 WHERE email = $2',
    [req.body.streak, req.user.email]
  );
  res.json({ ok: true });
});

// ---------------------------------------------------------------
// 📩 CONTACT FORM
// ---------------------------------------------------------------
app.post('/api/contact', async (req, res) => {
  const { email, message } = req.body;
  await transporter.sendMail({
    from: email,
    to: process.env.EMAIL_USER,
    subject: 'Contact',
    text: message,
  });
  res.json({ ok: true });
});

// ---------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
