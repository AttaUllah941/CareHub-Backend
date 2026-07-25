const { BadRequestError } = require('../../core/errors/AppError');
const { saveFile } = require('../../shared/utils/storage');

const uploadFile = async (file, folder = 'general') => {
  if (!file) {
    throw new BadRequestError('No file uploaded. Use the "file" field.');
  }

  const { url } = await saveFile(file.buffer, file.originalname, folder);

  return {
    url,
    mimeType: file.mimetype,
    size: file.size,
  };
};

module.exports = {
  uploadFile,
};
