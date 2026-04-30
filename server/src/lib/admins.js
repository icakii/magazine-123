const db = require("../db")

const SUPER_ADMIN = "info@mirenmagazine.com"

async function isAdmin(email) {
  if (!email) return false
  const { rows } = await db.query("SELECT 1 FROM admins WHERE email = $1", [email])
  return rows.length > 0
}

function isSuperAdmin(email) {
  return email === SUPER_ADMIN
}

module.exports = { isAdmin, isSuperAdmin, SUPER_ADMIN }
