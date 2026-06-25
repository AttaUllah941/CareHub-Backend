const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  SORT_ORDERS,
} = require('../../shared/constants/pagination.constants');

/**
 * Normalizes pagination and sort query params from Express req.query.
 */
const parsePaginationQuery = (query, allowedSortFields = []) => {
  const page = Math.max(1, parseInt(query.page, 10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : allowedSortFields[0];
  const sortOrder = SORT_ORDERS.includes(query.sortOrder) ? query.sortOrder : 'desc';
  const sort = sortBy ? { [sortBy]: sortOrder === 'asc' ? 1 : -1 } : undefined;

  return { page, limit, skip, sortBy, sortOrder, sort };
};

/**
 * Builds pagination metadata for list responses.
 */
const buildPaginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 0,
});

module.exports = { parsePaginationQuery, buildPaginationMeta };
