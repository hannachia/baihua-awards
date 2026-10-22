import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// TESTING ONLY: files are stored on local disk.
// For production, upload to Cloudflare R2 / S3 / Cloudinary instead.
const dir = path.resolve('uploads');
fs.mkdirSync(dir, { recursive: true });

const ALLOWED = ['video/mp4', 'image/jpeg', 'image/png', 'application/pdf'];

export default multer({
  storage: multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase())
  }),
  limits: { fileSize: 150 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error('BAD_FILE_TYPE')))
});
