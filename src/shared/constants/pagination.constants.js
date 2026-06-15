const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const ALLOWED_SORT_FIELDS = Object.freeze([
  'firstName',
  'lastName',
  'email',
  'role',
  'createdAt',
  'lastLoginAt',
  'isActive',
]);

const SORT_ORDERS = Object.freeze(['asc', 'desc']);

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  ALLOWED_SORT_FIELDS,
  SORT_ORDERS,
};
