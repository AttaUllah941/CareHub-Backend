const { body, param, query } = require('express-validator');
const { MAX_LIMIT } = require('../../../shared/constants/pagination.constants');

const slugRegex = /^[a-z]+:[a-z]+$/;
const roleSlugRegex = /^[A-Z][A-Z0-9_]*$/;

const permissionIdParam = [param('id').isMongoId().withMessage('Invalid permission ID')];
const roleIdParam = [param('id').isMongoId().withMessage('Invalid role ID')];

const listPermissionsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('search').optional().trim().isLength({ max: 100 }),
  query('module').optional().trim(),
  query('isActive').optional().isIn(['true', 'false']),
  query('sortBy').optional().isIn(['name', 'slug', 'module', 'createdAt']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

const createPermissionDto = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('slug').trim().notEmpty().matches(slugRegex).withMessage('Slug must be module:action format'),
  body('module').trim().notEmpty().isLength({ max: 50 }),
  body('description').optional().trim().isLength({ max: 255 }),
];

const updatePermissionDto = [
  ...permissionIdParam,
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('slug').optional().trim().matches(slugRegex),
  body('module').optional().trim().notEmpty(),
  body('description').optional().trim().isLength({ max: 255 }),
  body('isActive').optional().isBoolean(),
];

const listRolesQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('search').optional().trim().isLength({ max: 100 }),
  query('isActive').optional().isIn(['true', 'false']),
  query('isSystem').optional().isIn(['true', 'false']),
  query('sortBy').optional().isIn(['name', 'slug', 'createdAt', 'isActive']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

const createRoleDto = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('slug').trim().notEmpty().matches(roleSlugRegex).withMessage('Slug must be UPPER_SNAKE_CASE'),
  body('description').optional().trim().isLength({ max: 255 }),
  body('permissionIds').optional().isArray(),
  body('permissionIds.*').optional().isMongoId(),
];

const updateRoleDto = [
  ...roleIdParam,
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 255 }),
  body('isActive').optional().isBoolean(),
];

const assignPermissionsDto = [
  ...roleIdParam,
  body('permissionIds').isArray({ min: 0 }).withMessage('permissionIds must be an array'),
  body('permissionIds.*').isMongoId().withMessage('Invalid permission ID'),
];

const assignRoleToUserDto = [
  ...roleIdParam,
  body('userId').isMongoId().withMessage('Invalid user ID'),
];

module.exports = {
  permissionIdParam,
  roleIdParam,
  listPermissionsQueryDto,
  createPermissionDto,
  updatePermissionDto,
  listRolesQueryDto,
  createRoleDto,
  updateRoleDto,
  assignPermissionsDto,
  assignRoleToUserDto,
};
