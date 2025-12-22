// server/src/routes/upload.js
const express = require("express")
const router = express.Router()
const upload = require("../lib/upload")
const auth = require("../middleware/auth.middleware")

router.post("/upload", auth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      // multer/cloudinary errors
      return res.status(400).json({
        error: "Upload failed",
        details: err.message || String(err),
      })
    }

    if (!req.file) return res.status(400).json({ error: "No file uploaded" })

    // multer-storage-cloudinary usually puts secure URL in req.file.path
    const url = req.file.path || req.file.secure_url || ""

    res.json({
      url,
      secure_url: url,
      public_id: req.file.filename || req.file.public_id || "",
      mime: req.file.mimetype || null,
    })
  })
})

module.exports = router
