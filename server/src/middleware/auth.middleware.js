const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const token = req.cookies[process.env.COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid session' });
  }
}

module.exports = { authRequired };
