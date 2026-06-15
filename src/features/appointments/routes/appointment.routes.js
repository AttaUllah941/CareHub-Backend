const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  appointmentIdParam,
  availableSlotsQueryDto,
  recurringSlotsQueryDto,
  listAppointmentsQueryDto,
  myAppointmentsQueryDto,
  bookAppointmentDto,
  updateAppointmentDto,
  cancelAppointmentDto,
  rescheduleAppointmentDto,
  updateStatusDto,
} = require('../dto/appointment.dto');

const router = Router();
const appointmentController = container.resolve('appointmentController');

router.get(
  '/available-slots/range',
  authenticate,
  authorize(
    UserRole.PATIENT,
    UserRole.DOCTOR,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.CLINIC_MANAGER,
  ),
  recurringSlotsQueryDto,
  validate,
  appointmentController.getRecurringSlots,
);

router.get(
  '/available-slots',
  authenticate,
  authorize(
    UserRole.PATIENT,
    UserRole.DOCTOR,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.CLINIC_MANAGER,
  ),
  availableSlotsQueryDto,
  validate,
  appointmentController.getAvailableSlots,
);

router.get(
  '/me',
  authenticate,
  authorize(UserRole.PATIENT),
  myAppointmentsQueryDto,
  validate,
  appointmentController.getMyAppointments,
);

router.post(
  '/me',
  authenticate,
  authorize(UserRole.PATIENT),
  bookAppointmentDto,
  validate,
  appointmentController.bookAppointment,
);

router.get(
  '/me/:id',
  authenticate,
  authorize(UserRole.PATIENT),
  appointmentIdParam,
  validate,
  appointmentController.getAppointmentById,
);

router.put(
  '/me/:id',
  authenticate,
  authorize(UserRole.PATIENT),
  updateAppointmentDto,
  validate,
  appointmentController.updateMyAppointment,
);

router.patch(
  '/me/:id/cancel',
  authenticate,
  authorize(UserRole.PATIENT),
  cancelAppointmentDto,
  validate,
  appointmentController.cancelMyAppointment,
);

router.patch(
  '/me/:id/reschedule',
  authenticate,
  authorize(UserRole.PATIENT),
  rescheduleAppointmentDto,
  validate,
  appointmentController.rescheduleMyAppointment,
);

router.get(
  '/doctor',
  authenticate,
  authorize(UserRole.DOCTOR),
  myAppointmentsQueryDto,
  validate,
  appointmentController.getDoctorAppointments,
);

router.patch(
  '/doctor/:id/status',
  authenticate,
  authorize(UserRole.DOCTOR),
  updateStatusDto,
  validate,
  appointmentController.updateDoctorAppointmentStatus,
);

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT),
  appointmentIdParam,
  validate,
  appointmentController.getAppointmentById,
);

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', listAppointmentsQueryDto, validate, appointmentController.getAppointments);
router.put('/:id', updateAppointmentDto, validate, appointmentController.updateAppointment);
router.patch('/:id/cancel', cancelAppointmentDto, validate, appointmentController.cancelAppointment);
router.patch(
  '/:id/reschedule',
  rescheduleAppointmentDto,
  validate,
  appointmentController.rescheduleAppointment,
);
router.patch('/:id/status', updateStatusDto, validate, appointmentController.updateAppointmentStatus);

module.exports = router;
