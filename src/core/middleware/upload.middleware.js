const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { randomUUID } = require('crypto');
const config = require('../../config');
const { BadRequestError } = require('../errors/AppError');

const uploadRoot = path.resolve(process.cwd(), config.storage.uploadDir);
const pharmacyUploadRoot = path.resolve(process.cwd(), config.storage.pharmacyUploadDir);
const labReportUploadRoot = path.resolve(process.cwd(), config.storage.labReportUploadDir);
const chatUploadRoot = path.resolve(process.cwd(), config.storage.chatUploadDir);

function ensureUploadDir(root, subDir = '') {
  const dir = path.join(root, subDir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const patientId = req.body.patientProfileId || 'pending';
    const dir = ensureUploadDir(uploadRoot, patientId);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const pharmacyStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = ensureUploadDir(pharmacyUploadRoot, 'pending');
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${randomUUID()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!config.storage.allowedMimeTypes.includes(file.mimetype)) {
    return cb(new BadRequestError(`File type ${file.mimetype} is not allowed`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: config.storage.maxFileSizeMb * 1024 * 1024 },
  fileFilter,
});

const pharmacyUpload = multer({
  storage: pharmacyStorage,
  limits: { fileSize: config.storage.maxFileSizeMb * 1024 * 1024 },
  fileFilter,
});

const labReportStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = ensureUploadDir(labReportUploadRoot, 'pending');
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const labReportUpload = multer({
  storage: labReportStorage,
  limits: { fileSize: config.storage.maxFileSizeMb * 1024 * 1024 },
  fileFilter,
});

const chatStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = ensureUploadDir(chatUploadRoot, 'pending');
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: config.storage.maxFileSizeMb * 1024 * 1024 },
  fileFilter,
});

const uploadMedicalRecord = upload.single('file');
const uploadPrescriptionFile = pharmacyUpload.single('file');
const uploadLabReportFile = labReportUpload.single('file');
const uploadChatAttachment = chatUpload.single('file');

module.exports = {
  uploadMedicalRecord,
  uploadPrescriptionFile,
  uploadLabReportFile,
  uploadChatAttachment,
  ensureUploadDir,
  uploadRoot,
  pharmacyUploadRoot,
  labReportUploadRoot,
  chatUploadRoot,
};
