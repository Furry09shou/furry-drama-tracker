const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MAGIC_BYTES = {
  '/9j/': 'image/jpeg',
  'iVBOR': 'image/png',
  'R0lGOD': 'image/gif',
  'UklGR': 'image/webp',
};

const validateMagicBytes = (filePath) => {
  try {
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);
    const header = buffer.toString('base64');
    for (const [magic] of Object.entries(MAGIC_BYTES)) {
      if (header.startsWith(magic)) return true;
    }
    return false;
  } catch {
    return false;
  }
};

const createUploadConfig = (prefix, maxFileSize = 5 * 1024 * 1024) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${prefix}-${Date.now()}${path.extname(file.originalname)}`)
  });

  const fileFilter = (req, file, cb) => {
    const allowedExts = /jpeg|jpg|png|gif|webp/;
    const ext = allowedExts.test(path.extname(file.originalname).toLowerCase());
    const allowedMimes = /^image\/(jpeg|png|gif|webp)$/;
    const mime = allowedMimes.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('仅支持图片文件 (jpg, jpeg, png, gif, webp)'));
  };

  const upload = multer({ storage, fileFilter, limits: { fileSize: maxFileSize } });

  return {
    single: (fieldName) => {
      const multerMiddleware = upload.single(fieldName);
      return (req, res, next) => {
        multerMiddleware(req, res, (err) => {
          if (err) return next(err);
          if (req.file && !validateMagicBytes(req.file.path)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: '文件内容与类型不匹配，仅支持图片文件' });
          }
          next();
        });
      };
    },
  };
};

module.exports = { createUploadConfig };
