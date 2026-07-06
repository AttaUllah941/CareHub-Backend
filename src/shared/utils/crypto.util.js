const crypto = require('crypto');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateSecureToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

module.exports = { hashToken, generateSecureToken };
