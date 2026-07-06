const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;
const SORT_ORDERS = ['asc', 'desc'];

/**
 * Parses pagination and sort query params.
 */
const parsePaginationQuery = (
  query,
  allowedSortFields = [],
  defaultSortBy = 'createdAt',
  defaultLimit = DEFAULT_LIMIT,
) => {
  const page = Math.max(1, parseInt(query.page, 10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;

  const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : defaultSortBy;
  const sortOrder = SORT_ORDERS.includes(query.sortOrder) ? query.sortOrder : 'desc';
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

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

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  SORT_ORDERS,
  parsePaginationQuery,
  buildPaginationMeta,
};
