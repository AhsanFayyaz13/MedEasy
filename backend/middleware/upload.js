const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    // Random name — never trust the client filename.
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    cb(null, `${file.fieldname}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const IMAGE_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const DOC_TYPES = { ...IMAGE_TYPES, '.pdf': 'application/pdf' };

const filterFor = (allowed, message) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const expected = allowed[ext];
  // Extension AND declared MIME type must agree.
  if (expected && file.mimetype === expected) return cb(null, true);
  return cb(new Error(message));
};

const MAX_FILE_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES, 10) || 5 * 1024 * 1024;

/** Images or PDFs (prescriptions, documents). */
const upload = multer({ storage, limits: { fileSize: MAX_FILE_BYTES, files: 1 }, fileFilter: filterFor(DOC_TYPES, 'Images and PDFs only!') });

/** Images only (photos, avatars, storefronts). */
const imageUpload = multer({ storage, limits: { fileSize: MAX_FILE_BYTES, files: 1 }, fileFilter: filterFor(IMAGE_TYPES, 'Images only!') });

module.exports = upload;
module.exports.upload = upload;
module.exports.imageUpload = imageUpload;
