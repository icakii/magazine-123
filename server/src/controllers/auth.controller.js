const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const { findByEmail, createUser, updateTwoFA } = require('../models/user.model');
const { isValidEmail, isStrongPassword } = require('../utils/validators');
const { pool } = require('../db');
const { sendWelcome } = require('../services/email.service');

function setSessionCookie(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(process.env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

async function register(req, res) {
  const { email, password, displayName } = req.body;
  if (!isValidEmail(email) || !isStrongPassword(password) || !displayName) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const existing = await findByEmail(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await createUser({ email, passwordHash, displayName });
  await sendWelcome(email);
  return res.status(201).json({ id: user.id, email: user.email, displayName: user.display_name });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await findByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  if (user.twofa_enabled) {
    // Create a temporary login ticket (no cookie yet)
    const tempToken = jwt.sign({ step: '2fa', email: user.email }, process.env.JWT_SECRET, { expiresIn: '10m' });
    return res.json({ requires2fa: true, tempToken });
  }

  setSessionCookie(res, { sub: user.id, email: user.email });
  return res.json({ ok: true });
}

async function setup2FA(req, res) {
  const { email } = req.user;
  const secret = speakeasy.generateSecret({ name: 'Magazine-123' });
  await updateTwoFA(req.user.sub, { enabled: false, secret: secret.base32 });

  const dataUrl = await qrcode.toDataURL(secret.otpauth_url);
  return res.json({ qr: dataUrl });
}

async function enable2FA(req, res) {
  const { token } = req.body;
  const userSecretRow = await findByEmail(req.user.email);
  const verified = speakeasy.totp.verify({
    secret: userSecretRow.twofa_secret,
    encoding: 'base32',
    token,
    window: 1,
  });
  if (!verified) return res.status(400).json({ error: 'Invalid 2FA token' });

  await updateTwoFA(req.user.sub, { enabled: true, secret: userSecretRow.twofa_secret });
  return res.json({ twofa: true });
}

async function verify2FA(req, res) {
  const { tempToken, token } = req.body;
  try {
    const tempPayload = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (tempPayload.step !== '2fa') return res.status(400).json({ error: 'Invalid flow' });

    const user = await findByEmail(tempPayload.email);
    const verified = speakeasy.totp.verify({
      secret: user.twofa_secret,
      encoding: 'base32',
      token,
      window: 1,
    });
    if (!verified) return res.status(400).json({ error: 'Invalid 2FA token' });

    setSessionCookie(res, { sub: user.id, email: user.email });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid or expired temp token' });
  }
}

async function logout(req, res) {
  res.clearCookie(process.env.COOKIE_NAME);
  return res.json({ ok: true });
}

module.exports = { register, login, setup2FA, enable2FA, verify2FA, logout };
