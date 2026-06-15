const { query } = require('express-validator');

const analyticsQueryDto = [
  query('fromDate').optional().isISO8601().toDate(),
  query('toDate').optional().isISO8601().toDate(),
  query('granularity').optional().isIn(['daily', 'monthly']),
];

module.exports = { analyticsQueryDto };
