// server/src/routes/upload.js
const express = require("express")
const router = express.Router()
const upload = require("../lib/upload")
const auth = require("../middleware/auth.middleware")

router.post("/upload", auth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      console.error("UPLOAD ERROR:", err)
      return res.status(500).json({
        error: "Upload failed",
        details: err?.message || String(err),
      })
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    return res.json({
      url: req.file.path || "",
      secure_url: req.file.secure_url || req.file.path || "",
      public_id: req.file.filename || req.file.public_id || "",
      mime: req.file.mimetype || null,
      resource_type: req.file.resource_type || null,
      bytes: req.file.bytes || null,
    })
  })
})

module.exports = router
