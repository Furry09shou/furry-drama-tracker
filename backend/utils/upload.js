const multer = require('multer');
const path = require('path');

const createUploadConfig = (prefix, maxFileSize = 5 * 1024 * 1024) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${prefix}-${Date.now()}${path.extname(file.originalname)}`)
  });

  const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg\+xml/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.split('/')[1]) || file.mimetype.startsWith('image/');
    if (ext || mime) return cb(null, true);
    cb(new Error('仅支持图片文件'));
  };

  return multer({ storage, fileFilter, limits: { fileSize: maxFileSize } });
};

module.exports = { createUploadConfig };
