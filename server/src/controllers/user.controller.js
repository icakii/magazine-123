async function me(req, res) {
  return res.json({ id: req.user.sub, email: req.user.email });
}

module.exports = { me };
