const { pool } = require('../db');

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM app_user WHERE email=', [email]);
  return rows[0] || null;
}

async function createUser({ email, passwordHash, displayName }) {
  const { rows } = await pool.query(
    'INSERT INTO app_user(email, password_hash, display_name) VALUES(,,) RETURNING *',
    [email, passwordHash, displayName]
  );
  return rows[0];
}

async function updateTwoFA(userId, { enabled, secret }) {
  const { rows } = await pool.query(
    'UPDATE app_user SET twofa_enabled=, twofa_secret=, updated_at=NOW() WHERE id= RETURNING *',
    [userId, enabled, secret || null]
  );
  return rows[0];
}

module.exports = { findByEmail, createUser, updateTwoFA };
