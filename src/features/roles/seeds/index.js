const Permission = require('../models/permission.model');
const Role = require('../models/role.model');
const { DEFAULT_PERMISSIONS, DEFAULT_ROLES } = require('./rolesPermissions.seed');
const logger = require('../../../core/utils/logger');

/**
 * Seeds default permissions and system roles on application startup.
 * Idempotent — safe to run on every boot.
 */
const seedRolesAndPermissions = async () => {
  const permissionMap = new Map();

  for (const perm of DEFAULT_PERMISSIONS) {
    const doc = await Permission.findOneAndUpdate(
      { slug: perm.slug },
      { $setOnInsert: perm },
      { upsert: true, new: true },
    );
    permissionMap.set(perm.slug, doc._id);
  }

  for (const roleDef of DEFAULT_ROLES) {
    let permissionIds;
    if (roleDef.permissions.includes('*')) {
      permissionIds = [...permissionMap.values()];
    } else {
      permissionIds = roleDef.permissions.map((slug) => permissionMap.get(slug)).filter(Boolean);
    }

    await Role.findOneAndUpdate(
      { slug: roleDef.slug },
      {
        $setOnInsert: {
          name: roleDef.name,
          slug: roleDef.slug,
          description: roleDef.description,
          isSystem: roleDef.isSystem,
          isActive: true,
        },
        $set: { permissions: permissionIds },
      },
      { upsert: true, new: true },
    );
  }

  logger.info('Roles and permissions seeded successfully');
};

module.exports = { seedRolesAndPermissions };
