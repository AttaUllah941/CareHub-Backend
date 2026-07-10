const { v2: cloudinary } = require('cloudinary');
const config = require('../../config');

let configured = false;

const ensureConfigured = () => {
  if (configured) {
    return;
  }

  const { cloudName, apiKey, apiSecret } = config.cloudinary;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are not configured');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  configured = true;
};

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {string} folder - Subfolder under the configured Cloudinary root folder
 * @returns {Promise<{ url: string, storedName: string }>}
 */
const uploadBuffer = async (buffer, filename, folder = 'general') => {
  ensureConfigured();

  const extension = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
  const resourceType = extension === '.pdf' ? 'raw' : 'auto';
  const targetFolder = [config.cloudinary.folder, folder].filter(Boolean).join('/');

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: targetFolder,
        resource_type: resourceType,
        use_filename: false,
        unique_filename: true,
      },
      (error, uploadResult) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(uploadResult);
      },
    );

    stream.end(buffer);
  });

  return {
    url: result.secure_url,
    storedName: result.public_id,
  };
};

module.exports = {
  uploadBuffer,
};
