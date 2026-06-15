/**
 * Application role definitions for RBAC.
 * Each role maps to a specific set of permissions across the platform.
 */
const UserRole = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',
  PATIENT: 'PATIENT',
  CLINIC_MANAGER: 'CLINIC_MANAGER',
  PHARMACY: 'PHARMACY',
  LAB: 'LAB',
});

/** Roles allowed during public self-registration */
const SELF_REGISTER_ROLES = Object.freeze([
  UserRole.DOCTOR,
  UserRole.PATIENT,
  UserRole.CLINIC_MANAGER,
]);

/** Roles that can only be created by privileged admins */
const ADMIN_ONLY_ROLES = Object.freeze([
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
]);

module.exports = { UserRole, SELF_REGISTER_ROLES, ADMIN_ONLY_ROLES };
