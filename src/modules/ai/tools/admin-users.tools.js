const { z } = require('zod');
const { BadRequestError, ForbiddenError } = require('../../../core/errors/AppError');
const { UserRole, USER_ROLES } = require('../../../shared/enums/userRole.enum');
const adminService = require('../../admin/admin.service');
const { defineTool } = require('./tool.registry');
const { objectId, searchTextSchema, limitSchema, formatDateTime } = require('./tool.helpers');
const ui = require('./ui.helpers');

const PRIVILEGED = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
const fullName = (user) => `${user.firstName} ${user.lastName}`.trim();

/**
 * Safety rules on top of the existing endpoint (which has none): admins can't change their own
 * status, and only a SUPER_ADMIN may change another administrator's status.
 */
const assertMayChangeStatus = (actor, target, isActive) => {
  if (target.id === actor.id) throw new BadRequestError('You cannot change your own account status.');
  if (PRIVILEGED.includes(target.role) && actor.role !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Only a super admin can change another administrator\'s account status.');
  }
  if (target.isActive === isActive) {
    throw new BadRequestError(`This account is already ${isActive ? 'active' : 'inactive'}.`);
  }
};

const searchUsers = defineTool({
  name: 'searchUsers',
  agent: 'ADMIN',
  intent: 'users',
  description: 'Search platform users by name, email or phone, optionally by role or active status.',
  schema: z.object({
    search: searchTextSchema.optional(),
    role: z.enum(USER_ROLES).optional(),
    isActive: z.boolean().optional(),
    limit: limitSchema(15, 8),
  }),
  execute: async ({ search, role, isActive, limit }) => {
    const { users, pagination } = await adminService.listUsers({
      search,
      role,
      isActive: isActive === undefined ? undefined : String(isActive),
      page: 1,
      limit: limit ?? 8,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    return {
      data: {
        total: pagination.total,
        shown: users.length,
        users: users.map((u) => ({ id: u.id, name: fullName(u), email: u.email, phone: u.phone, role: u.role, isActive: u.isActive, joined: u.createdAt })),
      },
      actions: users.length
        ? [
            ui.list(
              `Users (${pagination.total} match${pagination.total === 1 ? '' : 'es'})`,
              users.map((u) => ({
                id: u.id,
                title: fullName(u),
                subtitle: `${u.email} · ${u.role}`,
                badge: u.isActive ? 'active' : 'inactive',
                tone: u.isActive ? 'success' : 'neutral',
                lines: [u.phone, u.createdAt ? `Joined ${formatDateTime(u.createdAt)}` : ''],
                actions: [
                  {
                    label: u.isActive ? 'Deactivate' : 'Activate',
                    message: `${u.isActive ? 'Deactivate' : 'Activate'} user ${u.email} (user id ${u.id}).`,
                  },
                ],
              })),
            ),
          ]
        : [],
    };
  },
});

const setUserActive = defineTool({
  name: 'setUserActive',
  agent: 'ADMIN',
  intent: 'users',
  requiresConfirmation: true,
  description: 'Propose activating or deactivating a user account. Needs the user id (use searchUsers). The admin must confirm.',
  schema: z.object({ userId: objectId('userId'), isActive: z.boolean() }),
  prepare: async ({ userId, isActive }, ctx) => {
    const { user } = await adminService.getUserById(userId);
    assertMayChangeStatus(ctx.user, user, isActive);
    return {
      args: { userId, isActive },
      summary: `${isActive ? 'Activate' : 'Deactivate'} the account of ${fullName(user)} (${user.email}, ${user.role}).${isActive ? '' : ' They will be signed out within about 30 seconds.'}`,
    };
  },
  execute: async ({ userId, isActive }, ctx) => {
    // Re-check at execution time: the target's role/status may have changed since the proposal.
    const { user } = await adminService.getUserById(userId);
    assertMayChangeStatus(ctx.user, user, isActive);
    const result = await adminService.updateUserStatus(userId, isActive);
    return {
      data: { userId, isActive: result.user.isActive },
      actions: [ui.list('Account updated', [{ id: userId, title: fullName(result.user), subtitle: result.user.email, badge: result.user.isActive ? 'active' : 'inactive', tone: result.user.isActive ? 'success' : 'neutral' }])],
      outcome: `${fullName(result.user)}'s account is now ${result.user.isActive ? 'active' : 'inactive'}.`,
    };
  },
});

module.exports = [searchUsers, setUserActive];
