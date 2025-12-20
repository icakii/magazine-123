const express = require("express")
const router = express.Router()
const upload = require("../lib/upload")
const auth = require("../middleware/auth.middleware")

router.post("/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" })
  }

  res.json({
    url: req.file.path,
    public_id: req.file.filename,
  })
})

module.exports = router
