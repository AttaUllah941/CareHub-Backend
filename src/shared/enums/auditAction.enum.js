const AuditAction = Object.freeze({
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
});

const AUDIT_ACTION_VALUES = Object.values(AuditAction);

module.exports = { AuditAction, AUDIT_ACTION_VALUES };
