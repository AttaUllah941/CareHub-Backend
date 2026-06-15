const { param, query } = require('express-validator');
const { AUDIT_ACTION_VALUES } = require('../../../shared/enums/auditAction.enum');

const mongoId = (field) => param(field).isMongoId();

const listAuditLogsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('action').optional().isIn(AUDIT_ACTION_VALUES),
  query('module').optional().trim(),
  query('entityType').optional().trim(),
  query('actorUserId').optional().isMongoId(),
  query('success').optional().isBoolean().toBoolean(),
  query('fromDate').optional().isISO8601(),
  query('toDate').optional().isISO8601(),
  query('search').optional().trim(),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

module.exports = { mongoId, listAuditLogsQueryDto };
