function isValidEmail(email) {
  return typeof email === 'string' && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}

function isStrongPassword(pwd) {
  return typeof pwd === 'string' && pwd.length >= 8;
}

module.exports = { isValidEmail, isStrongPassword };
