const { Pool } = require('pg');
require('dotenv').config();

// Vrazka s bazata danni
// Ako sme v Render, shte polzva DATABASE_URL.
// Ako sme lokalno, shte polzva tvoite danni.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Par0la1234@localhost:5433/miren_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};