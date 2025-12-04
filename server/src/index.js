// ------------ server/index.js (ВСИЧКО ВКЛЮЧЕНО) ------------

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

// Middleware
app.use(cookieParser());
app.use(cors({
  origin: FRONTEND_URL, 
  credentials: true,
}));

app.set('trust proxy', 1);

// =========================================================================
// 1. WEBHOOK ENDPOINT
// =========================================================================
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.log(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerEmail = session.customer_details.email; 
      
      if (session.payment_status === 'paid' && session.mode === 'subscription') {
        let plan = '';
        if (session.amount_total === 499) plan = 'monthly';
        if (session.amount_total === 4999) plan = 'yearly';

        try {
            await db.query('UPDATE subscriptions SET plan = $1 WHERE email = $2', [plan, customerEmail]);
            console.log(`✅ Subscription activated for ${customerEmail} to ${plan}`);
        } catch (dbErr) {
            console.error('DB UPDATE ERROR:', dbErr);
        }
      }
  }
  res.json({ received: true }); 
});

// =========================================================================
// 2. BODY PARSERS
// =========================================================================
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

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

function signToken(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }); }

// =========================================================================
// ROUTES
// =========================================================================

// 1. ARTICLES
app.get("/api/articles", async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM articles';
    let params = [];
    if (category) { query += ' WHERE category = $1'; params.push(category); }
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
  try { await db.query('DELETE FROM articles WHERE id = $1', [req.params.id]); res.json({ ok: true }); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. MAGAZINE SETTINGS
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
    await db.query("INSERT INTO settings (key, value) VALUES ('magazine', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [JSON.stringify(current)]);
    res.json({ ok: true, isPublic: current.isPublic });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. AUTH & USER
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } 
});

// --- Password Reset (ТОВА ЛИПСВАШЕ!) ---
app.post('/api/auth/reset-password-request', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 час

    // Записваме токена в базата (увери се, че си изпълнил SQL за reset_password_token)
    await db.query('UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3', [token, expiry, email]);

    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: '"MIREN Security" <icaki2k@gmail.com>',
      to: email,
      subject: 'Reset Your Password',
      html: `
        <p>You requested a password reset.</p>
        <p>Click the link below to reset it:</p>
        <a href="${resetUrl}" style="padding: 10px; background: #e63946; color: white; text-decoration: none;">Reset Password</a>
        <p>Link expires in 1 hour.</p>
      `
    });

    res.json({ ok: true, message: "Reset link sent!" });
  } catch (err) { console.error("Reset error:", err); res.status(500).json({ error: "Error sending email" }); }
});

// ФИНАЛНА СТЪПКА: Смяна на паролата с валиден токен
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  
  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required" });
  }

  try {
    // 1. Намираме потребителя с този токен И проверяваме дали не е изтекъл
    const { rows } = await db.query(
      'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()', 
      [token]
    );

    const user = rows[0];

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // 2. Хешираме новата парола
    const hash = await bcrypt.hash(newPassword, 10);

    // 3. Записваме новата парола и изчистваме токена
    await db.query(
      'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE email = $2',
      [hash, user.email]
    );

    res.json({ ok: true, message: "Password has been reset successfully! You can now login." });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------

// Send 2FA
app.post('/api/auth/send-2fa', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  try {
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) return res.status(404).json({ error: "User not found" });
    
    const code = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); 
    await db.query('UPDATE users SET two_fa_code = $1, two_fa_expiry = $2 WHERE email = $3', [code, expiry, email]);

    await transporter.sendMail({
      from: '"MIREN" <icaki2k@gmail.com>',
      to: email,
      subject: 'Your MIREN Verification Code',
      html: `<p>Your code: <h2>${code}</h2></p>`
    });
    res.json({ ok: true, message: "Code sent" });
  } catch (err) { console.error("Send 2FA error:", err); res.status(500).json({ error: "Error sending code" }); }
});

// Verify 2FA
app.post('/api/auth/verify-2fa', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "Email/code required" });
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.two_fa_code !== code) return res.status(401).json({ error: "Invalid code" });
    if (new Date() > new Date(user.two_fa_expiry)) return res.status(401).json({ error: "Code expired" });

    await db.query('UPDATE users SET two_fa_enabled = true, two_fa_code = NULL, two_fa_expiry = NULL WHERE email = $1', [email]);
    const authToken = signToken({ email: user.email });
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth', authToken, { httpOnly: true, sameSite: isProduction ? 'none' : 'lax', secure: isProduction });
    res.json({ ok: true, message: "Verification successful!" });
  } catch (err) { console.error("Verify 2FA error:", err); res.status(500).json({ error: "Error verifying" }); }
});

// Auth Check
app.get("/api/auth/check", async (req, res) => {
  const { email, displayName } = req.query;
  try {
    let query = "SELECT 1 FROM users WHERE";
    let params = [];
    if (email) { query += " email = $1"; params.push(email); } 
    else if (displayName) { query += " display_name = $1"; params.push(displayName); } 
    else { return res.json({ taken: false }); }
    const { rows } = await db.query(query, params);
    res.json({ taken: rows.length > 0 });
  } catch (err) { console.error("Check error:", err.message); res.json({ taken: false }); }
});

// Register
app.post("/api/auth/register", async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) return res.status(400).json({ error: "All fields required" });

  try {
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) return res.status(409).json({ error: "Email taken" });
    const nameCheck = await db.query('SELECT * FROM users WHERE display_name = $1', [displayName]);
    if (nameCheck.rows.length > 0) return res.status(409).json({ error: "Display name taken" });

    const hash = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');
    
    await db.query('INSERT INTO users (email, display_name, password_hash, created_at, confirmation_token, is_confirmed) VALUES ($1, $2, $3, NOW(), $4, false)', [email, displayName, hash, token]);
    await db.query('INSERT INTO subscriptions (email, plan) VALUES ($1, $2)', [email, 'free']);
    
    const confirmationUrl = `${APP_URL}/confirm?token=${token}`;
    console.log("Sending email to:", email); 

    await transporter.sendMail({
      from: '"MIREN" <icaki2k@gmail.com>',
      to: email,
      subject: 'Confirm your account',
      html: `<p>Welcome!</p><p>Click below to confirm:</p><a href="${confirmationUrl}" style="padding: 10px; background: #e63946; color: white;">Confirm Email</a>`
    });
    
    res.status(201).json({ ok: true, message: "Registration successful! Check email." });
  } catch (err) { console.error("Register Error:", err); res.status(500).json({ error: "Registration failed" }); }
});

// Confirm
app.post('/api/auth/confirm', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Missing token" });
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE confirmation_token = $1', [token]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "Invalid token" });

    await db.query('UPDATE users SET is_confirmed = true, confirmation_token = NULL WHERE email = $1', [user.email]);
    const authToken = signToken({ email: user.email });
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth', authToken, { httpOnly: true, sameSite: isProduction ? 'none' : 'lax', secure: isProduction });
    res.json({ ok: true, message: "Confirmed!" });
  } catch (err) { console.error(err); res.status(500).json({ error: "Confirm error" }); }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_confirmed) return res.status(403).json({ error: 'Please confirm email first.' });
    if (user.two_fa_enabled) return res.json({ ok: true, requires2fa: true });
    
    const token = signToken({ email: user.email });
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth', token, { httpOnly: true, sameSite: isProduction ? 'none' : 'lax', secure: isProduction });
    res.json({ ok: true, user: { email: user.email, displayName: user.display_name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Logout
app.post('/api/auth/logout', (req, res) => { 
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('auth', { httpOnly: true, sameSite: isProduction ? 'none' : 'lax', secure: isProduction });
    res.json({ ok: true }); 
});

// User Me (Включва two_fa_enabled)
app.get('/api/user/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT email, display_name, last_username_change, two_fa_enabled FROM users WHERE email = $1', [req.user.email]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    res.json({ 
        email: rows[0].email, 
        displayName: rows[0].display_name, 
        lastUsernameChange: rows[0].last_username_change,
        twoFaEnabled: rows[0].two_fa_enabled // <-- Връщаме статуса на 2FA
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Subscriptions GET
app.get('/api/subscriptions', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT plan FROM subscriptions WHERE email = $1 ORDER BY id DESC LIMIT 1', [req.user.email]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update Username
app.post('/api/user/update-username', authMiddleware, async (req, res) => {
    const { newUsername } = req.body;
    const email = req.user.email;
    try {
        const subRes = await db.query('SELECT plan FROM subscriptions WHERE email = $1 ORDER BY id DESC LIMIT 1', [email]);
        const plan = subRes.rows[0]?.plan?.toLowerCase() || 'free';
        if (plan !== 'monthly' && plan !== 'yearly') return res.status(403).json({ error: "Premium only feature" });
        await db.query('UPDATE users SET display_name = $1, last_username_change = NOW() WHERE email = $2', [newUsername, email]);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Streak
app.post('/api/user/streak', authMiddleware, async (req, res) => {
    try { await db.query('UPDATE users SET wordle_streak = $1 WHERE email = $2', [req.body.streak, req.user.email]); res.json({ ok: true }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// Stripe Checkout
app.post('/api/create-checkout-session', authMiddleware, async (req, res) => {
  const { plan } = req.body;
  const userEmail = req.user.email;
  const frontendUrl = process.env.APP_URL; 

  let priceData;
  if (plan === 'monthly') priceData = { product_data: { name: 'MIREN Monthly' }, unit_amount: 499, currency: 'eur', recurring: { interval: 'month' } };
  else if (plan === 'yearly') priceData = { product_data: { name: 'MIREN Yearly' }, unit_amount: 4999, currency: 'eur', recurring: { interval: 'year' } };
  else return res.status(400).json({ error: 'Invalid plan' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price_data: priceData, quantity: 1 }],
      customer_email: userEmail,
      success_url: `${frontendUrl}/profile?payment_success=true`,
      cancel_url: `${frontendUrl}/subscriptions`,
    });
    res.json({ url: session.url });
  } catch (e) { console.error("Stripe Error:", e.message); res.status(500).json({ error: e.message }); }
});

// Start Server
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));