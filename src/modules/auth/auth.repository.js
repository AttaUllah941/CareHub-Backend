const { PasswordResetToken, hashToken } = require('./auth.model');

const createPasswordResetToken = (data) => PasswordResetToken.create(data);

const findValidPasswordResetToken = (token) =>
  PasswordResetToken.findOne({
    tokenHash: hashToken(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

const markPasswordResetTokenUsed = (id) =>
  PasswordResetToken.findByIdAndUpdate(id, { usedAt: new Date() }, { new: true });

const invalidateUserPasswordResetTokens = (userId) =>
  PasswordResetToken.updateMany(
    { userId, usedAt: null },
    { usedAt: new Date() },
  );

module.exports = {
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  invalidateUserPasswordResetTokens,
};
