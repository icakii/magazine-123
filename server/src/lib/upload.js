// server/src/lib/upload.js
const multer = require("multer")
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const cloudinary = require("./cloudinary")

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file?.mimetype?.startsWith("video/")
    const isImage = file?.mimetype?.startsWith("image/")

    return {
      folder: "miren",
      resource_type: "auto", // ✅ IMPORTANT for mp4/webm/etc
      allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4", "webm", "mov"],

      // ✅ only for images (video + transformation sometimes throws)
      ...(isImage
        ? { transformation: [{ quality: "auto" }] }
        : {}),

      // optional: give unique name
      // public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`,
    }
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // ✅ bump to 50MB (11.1MB is fine anyway)
  },
})

module.exports = upload
