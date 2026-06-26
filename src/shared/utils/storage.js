const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('../../config');

const resolveUploadDir = () => path.resolve(process.cwd(), config.storage.uploadDir);

const ensureUploadDir = async () => {
  await fs.mkdir(resolveUploadDir(), { recursive: true });
};

/**
 * Persists a file buffer and returns its public URL.
 * @param {Buffer} buffer
 * @param {string} filename - Original filename (used for extension)
 * @returns {Promise<{ url: string, storedName: string }>}
 */
const saveFile = async (buffer, filename) => {
  // TODO: Swap to S3 (or compatible object storage) in production by implementing
  // saveFileToS3(buffer, filename) and branching on config.storage.provider === 's3'.
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

module.exports = {
  saveFile,
  ensureUploadDir,
  resolveUploadDir,
};
