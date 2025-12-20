const multer = require("multer")
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const cloudinary = require("./cloudinary")

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "miren",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4"],
    transformation: [{ quality: "auto" }],
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
})

module.exports = upload
