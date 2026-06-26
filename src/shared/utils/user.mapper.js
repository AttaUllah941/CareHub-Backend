const toUserResponse = (user) => ({
  id: user._id.toString(),
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt.toISOString(),
  fullName: `${user.firstName} ${user.lastName}`.trim(),
});

module.exports = { toUserResponse };
