// routes/ocr.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { processImage } = require("../controllers/Ocr");

// Simpan sementara file upload ke folder /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// POST /ocr
router.post("/", upload.single("image"), processImage);

module.exports = router;
