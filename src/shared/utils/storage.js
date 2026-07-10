const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('../../config');
const { uploadBuffer } = require('./cloudinary');

const resolveUploadDir = () => path.resolve(process.cwd(), config.storage.uploadDir);

const ensureUploadDir = async () => {
  await fs.mkdir(resolveUploadDir(), { recursive: true });
};

const saveFileLocally = async (buffer, filename) => {
  await ensureUploadDir();

  const extension = path.extname(filename).toLowerCase();
  const storedName = `${crypto.randomUUID()}${extension}`;
  const absolutePath = path.join(resolveUploadDir(), storedName);

  await fs.writeFile(absolutePath, buffer);

  return {
    url: `/uploads/${storedName}`,
    storedName,
  };
};

/**
 * Persists a file buffer and returns its public URL.
 * @param {Buffer} buffer
 * @param {string} filename - Original filename (used for extension)
 * @param {string} [folder] - Cloudinary subfolder when using cloud storage
 * @returns {Promise<{ url: string, storedName: string }>}
 */
const saveFile = async (buffer, filename, folder = 'general') => {
  if (config.storage.provider === 'cloudinary') {
    return uploadBuffer(buffer, filename, folder);
  }

  return saveFileLocally(buffer, filename);
};

module.exports = {
  saveFile,
  ensureUploadDir,
  resolveUploadDir,
};
