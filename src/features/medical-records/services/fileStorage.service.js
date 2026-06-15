const fs = require('fs/promises');
const path = require('path');
const { uploadRoot } = require('../../../core/middleware/upload.middleware');

class FileStorageService {
  resolveAbsolutePath(storagePath) {
    return path.join(uploadRoot, storagePath);
  }

  async readFile(storagePath) {
    const absolute = this.resolveAbsolutePath(storagePath);
    return fs.readFile(absolute);
  }

  async deleteFile(storagePath) {
    try {
      const absolute = this.resolveAbsolutePath(storagePath);
      await fs.unlink(absolute);
    } catch {
      // ignore missing files during cleanup
    }
  }

  buildStoragePath(patientProfileId, fileName) {
    return path.join(String(patientProfileId), fileName).replace(/\\/g, '/');
  }
}

module.exports = FileStorageService;
