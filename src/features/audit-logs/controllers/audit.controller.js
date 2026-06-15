const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class AuditController {
  constructor(auditService) {
    this.auditService = auditService;
  }

  getLogs = asyncHandler(async (req, res) => {
    const result = await this.auditService.getLogs(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getLogById = asyncHandler(async (req, res) => {
    const log = await this.auditService.getLogById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { log } });
  });
}

module.exports = AuditController;
