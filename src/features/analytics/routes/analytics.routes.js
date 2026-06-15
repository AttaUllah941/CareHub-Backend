const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const { analyticsQueryDto } = require('../dto/analytics.dto');

const router = Router();
const analyticsController = container.resolve('analyticsController');

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/overview', analyticsQueryDto, validate, analyticsController.getOverview);
router.get('/revenue-trends', analyticsQueryDto, validate, analyticsController.getRevenueTrends);
router.get('/doctor-growth', analyticsQueryDto, validate, analyticsController.getDoctorGrowth);
router.get('/patient-growth', analyticsQueryDto, validate, analyticsController.getPatientGrowth);
router.get('/appointment-growth', analyticsQueryDto, validate, analyticsController.getAppointmentGrowth);

module.exports = router;
