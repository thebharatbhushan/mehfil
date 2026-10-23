import multer from "multer";

// Spotlight posters are held in memory (<= 5 MB) and streamed to Cloudinary; nothing is written to the server disk,
// which matters on hosts with an ephemeral filesystem.
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPG, PNG and WebP images are allowed"), false);
  },
});

/** Like upload.single(field) but turns multer errors into a JSON 400 the admin panel can show. */
export const spotlightUploadSingle = (field) => (req, res, next) => {
  upload.single(field)(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "Image must be 5 MB or smaller" : err.message || "Upload failed";
    return res.status(400).json({ success: false, message });
  });
};
