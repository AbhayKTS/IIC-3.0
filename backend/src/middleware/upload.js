const multer = require('multer');
const CustomError = require('../utils/CustomError');

const storage = multer.memoryStorage();

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
];

const ALLOWED_RESUME_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
];

const imageFileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(
    new CustomError(
      'Invalid file type. Only JPEG, PNG, and WEBP images are allowed.',
      400,
      'invalid_file_type'
    ),
    false
  );
};

const resumeFileFilter = (req, file, cb) => {
  if (ALLOWED_RESUME_MIME_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(
    new CustomError(
      'Invalid resume file type. Only PDF, DOCX, and image files (max 5MB) are allowed.',
      400,
      'invalid_file_type'
    ),
    false
  );
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFileFilter,
});

const uploadResume = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: resumeFileFilter,
});

upload.uploadResume = uploadResume;

module.exports = upload;
module.exports.uploadResume = uploadResume;
