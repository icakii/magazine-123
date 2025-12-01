// server/delete-user.js
const fs = require('fs');
const path = require('path');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node delete-user.js user@example.com');
  process.exit(1);
}

const file = path.join(__dirname, 'data', 'users.json');
if (!fs.existsSync(file)) {
  console.error('users.json not found');
  process.exit(1);
}

const raw = fs.readFileSync(file, 'utf8');
let users = {};
try { users = JSON.parse(raw || '{}'); } catch (e) { console.error('Invalid JSON'); process.exit(1); }

if (!users[email]) {
  console.log('User not found:', email);
  process.exit(0);
}

delete users[email];
fs.writeFileSync(file, JSON.stringify(users, null, 2), 'utf8');
console.log('Deleted user:', email);
