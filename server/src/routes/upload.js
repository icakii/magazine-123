// server/src/routes/upload.js
const express = require("express")
const router = express.Router()
const upload = require("../lib/upload")
const auth = require("../middleware/auth.middleware")

router.post("/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" })

  // multer-storage-cloudinary usually gives:
  // req.file.path (secure url), req.file.filename (public_id)
  res.json({
    url: req.file.path || "",
    secure_url: req.file.path || "",
    public_id: req.file.filename || "",
    mime: req.file.mimetype || null,
  })
})

module.exports = router
