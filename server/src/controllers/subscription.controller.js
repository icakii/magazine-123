const { pool } = require('../db');
const { sendSubscription } = require('../services/email.service');

async function createSubscription(req, res) {
  const { plan } = req.body;
  if (!plan) return res.status(400).json({ error: 'Plan required' });

  const userId = req.user.sub;
  const { rows } = await pool.query(
    'INSERT INTO subscription(user_id, plan, status) VALUES(,,) RETURNING *',
    [userId, plan, 'active']
  );
  await sendSubscription(req.user.email, plan);
  return res.json(rows[0]);
}

async function getMySubscriptions(req, res) {
  const userId = req.user.sub;
  const { rows } = await pool.query('SELECT * FROM subscription WHERE user_id=', [userId]);
  return res.json(rows);
}

module.exports = { createSubscription, getMySubscriptions };
