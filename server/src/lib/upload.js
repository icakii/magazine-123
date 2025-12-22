// server/src/lib/upload.js
const multer = require("multer")
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const cloudinary = require("./cloudinary")

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // allow both images + video
    return {
      folder: "miren",
      resource_type: "auto", // ✅ IMPORTANT for mp4/video
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm", "mov"],
    }
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // ✅ 50MB
  },
})

module.exports = upload
