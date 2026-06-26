const User = require('../users/users.model');
const { RefreshToken, PasswordResetToken } = require('./auth.model');

const findUserByEmail = (email, { includePassword = false } = {}) => {
  const query = User.findOne({ email: email.toLowerCase() });
  return includePassword ? query.select('+passwordHash') : query;
};

const findUserById = (id, { includePassword = false } = {}) => {
  const query = User.findById(id);
  return includePassword ? query.select('+passwordHash') : query;
};

const createUser = (data) => User.create(data);

const updateUserPassword = (userId, passwordHash) =>
  User.findByIdAndUpdate(userId, { passwordHash }, { new: true });

const createRefreshToken = (data) => RefreshToken.create(data);

const findRefreshTokenByHash = (tokenHash) => RefreshToken.findOne({ tokenHash });

const revokeRefreshTokenById = (id) => RefreshToken.findByIdAndDelete(id);

const revokeAllRefreshTokensForUser = (userId) => RefreshToken.deleteMany({ userId });

const createPasswordResetToken = (data) => PasswordResetToken.create(data);

const findValidPasswordResetToken = (tokenHash) =>
  PasswordResetToken.findOne({
    tokenHash,
    used: false,
    expiresAt: { $gt: new Date() },
  });

const markPasswordResetTokenUsed = (id) =>
  PasswordResetToken.findByIdAndUpdate(id, { used: true });

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserPassword,
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshTokenById,
  revokeAllRefreshTokensForUser,
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
};
