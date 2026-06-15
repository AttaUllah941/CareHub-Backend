const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { uploadLabReportFile } = require('../../../core/middleware/upload.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  mongoId,
  listLabsQueryDto,
  createLabDto,
  updateLabDto,
  listTestsQueryDto,
  createTestDto,
  updateTestDto,
  createBookingDto,
  updateBookingStatusDto,
  cancelBookingDto,
  uploadReportDto,
} = require('../dto/lab.dto');

const router = Router();
const labController = container.resolve('labController');

const browseRoles = [UserRole.PATIENT, UserRole.DOCTOR, UserRole.LAB, UserRole.SUPER_ADMIN, UserRole.ADMIN];
const labStaff = [UserRole.LAB, UserRole.SUPER_ADMIN, UserRole.ADMIN];
const patientOnly = [UserRole.PATIENT];

// Lab listings
router.get('/labs', authenticate, authorize(...browseRoles), listLabsQueryDto, validate, labController.getLabs);
router.get('/labs/:id', authenticate, authorize(...browseRoles), mongoId('id'), validate, labController.getLabById);
router.post('/labs', authenticate, authorize(...labStaff), createLabDto, validate, labController.createLab);
router.put('/labs/:id', authenticate, authorize(...labStaff), mongoId('id'), updateLabDto, validate, labController.updateLab);
router.delete('/labs/:id', authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), mongoId('id'), validate, labController.deleteLab);

// Lab tests
router.get('/tests', authenticate, authorize(...browseRoles), listTestsQueryDto, validate, labController.getTests);
router.get('/tests/:id', authenticate, authorize(...browseRoles), mongoId('id'), validate, labController.getTestById);
router.post('/tests', authenticate, authorize(...labStaff), createTestDto, validate, labController.createTest);
router.put('/tests/:id', authenticate, authorize(...labStaff), mongoId('id'), updateTestDto, validate, labController.updateTest);
router.delete('/tests/:id', authenticate, authorize(...labStaff), mongoId('id'), validate, labController.deleteTest);

// Bookings — patient
router.get('/bookings/me', authenticate, authorize(...patientOnly), labController.getMyBookings);
router.post('/bookings', authenticate, authorize(...patientOnly), createBookingDto, validate, labController.createBooking);
router.post(
  '/bookings/:id/cancel',
  authenticate,
  authorize(UserRole.PATIENT, ...labStaff),
  mongoId('id'),
  cancelBookingDto,
  validate,
  labController.cancelBooking,
);
router.get(
  '/bookings/:id',
  authenticate,
  authorize(UserRole.PATIENT, ...labStaff),
  mongoId('id'),
  validate,
  labController.getBookingById,
);

// Bookings — lab staff
router.get('/bookings', authenticate, authorize(...labStaff), labController.getBookings);
router.patch(
  '/bookings/:id/status',
  authenticate,
  authorize(...labStaff),
  mongoId('id'),
  updateBookingStatusDto,
  validate,
  labController.updateBookingStatus,
);

// Reports
router.get('/reports/me', authenticate, authorize(...patientOnly), labController.getMyReports);
router.get(
  '/reports/:id/download',
  authenticate,
  authorize(UserRole.PATIENT, ...labStaff),
  mongoId('id'),
  validate,
  labController.downloadReport,
);
router.get(
  '/reports/:id',
  authenticate,
  authorize(UserRole.PATIENT, ...labStaff),
  mongoId('id'),
  validate,
  labController.getReportById,
);
router.get('/reports', authenticate, authorize(...labStaff), labController.getReports);
router.post(
  '/reports',
  authenticate,
  authorize(...labStaff),
  uploadLabReportFile,
  uploadReportDto,
  validate,
  labController.uploadReport,
);

module.exports = router;
