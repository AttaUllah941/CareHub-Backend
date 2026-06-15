const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  reportQueryDto,
  doctorReportQueryDto,
  appointmentReportQueryDto,
} = require('../dto/report.dto');

const router = Router();
const reportController = container.resolve('reportController');

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/revenue', reportQueryDto, validate, reportController.getRevenueReport);
router.get('/revenue/export/pdf', reportQueryDto, validate, reportController.exportRevenuePdf);
router.get('/revenue/export/excel', reportQueryDto, validate, reportController.exportRevenueExcel);

router.get('/doctors', doctorReportQueryDto, validate, reportController.getDoctorReport);
router.get('/doctors/export/pdf', doctorReportQueryDto, validate, reportController.exportDoctorPdf);
router.get('/doctors/export/excel', doctorReportQueryDto, validate, reportController.exportDoctorExcel);

router.get('/patients', reportQueryDto, validate, reportController.getPatientReport);
router.get('/patients/export/pdf', reportQueryDto, validate, reportController.exportPatientPdf);
router.get('/patients/export/excel', reportQueryDto, validate, reportController.exportPatientExcel);

router.get('/appointments', appointmentReportQueryDto, validate, reportController.getAppointmentReport);
router.get('/appointments/export/pdf', appointmentReportQueryDto, validate, reportController.exportAppointmentPdf);
router.get(
  '/appointments/export/excel',
  appointmentReportQueryDto,
  validate,
  reportController.exportAppointmentExcel,
);

module.exports = router;
