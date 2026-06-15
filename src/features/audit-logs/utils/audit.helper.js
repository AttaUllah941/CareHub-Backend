function stripSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = obj.toJSON ? obj.toJSON() : { ...obj };
  delete copy.password;
  delete copy.refreshToken;
  delete copy.passwordResetToken;
  delete copy.passwordResetExpires;
  return copy;
}

function buildActor(requestedBy, fallbackEmail) {
  if (!requestedBy && !fallbackEmail) return {};
  return {
    actorUserId: requestedBy?.id || requestedBy?._id?.toString(),
    actorEmail: requestedBy?.email || fallbackEmail,
    actorRole: requestedBy?.role,
  };
}

module.exports = { stripSensitive, buildActor };
