const { Pool } = require('pg');
require('dotenv').config();

// Връзка с базата данни: Настроена на ПОРТ 5434 и Парола
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Par0la1234@localhost:5434/miren_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};