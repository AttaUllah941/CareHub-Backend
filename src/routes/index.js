const { Router } = require('express');
const { successResponse } = require('../core/utils/apiResponse');
const reviewsRoutes = require('../modules/reviews/reviews.routes');
const reviewsDoctorRoutes = require('../modules/reviews/reviews.doctor.routes');
const uploadsRoutes = require('../modules/uploads/uploads.routes');
const doctorApplicationsRoutes = require('../modules/doctor-applications/doctor-applications.routes');
const doctorApplicationsAdminRoutes = require('../modules/doctor-applications/doctor-applications.admin.routes');
const hospitalsRoutes = require('../modules/hospitals/hospitals.routes');
const hospitalsAdminRoutes = require('../modules/hospitals/hospitals.admin.routes');
const labsRoutes = require('../modules/labs/labs.routes');
const labsAdminRoutes = require('../modules/labs/labs.admin.routes');
const labBookingsRoutes = require('../modules/labs/lab-bookings.routes');
const surgeriesRoutes = require('../modules/surgeries/surgeries.routes');
const surgeriesAdminRoutes = require('../modules/surgeries/surgeries.admin.routes');
const medicinesRoutes = require('../modules/medicines/medicines.routes');
const medicinesAdminRoutes = require('../modules/medicines/medicines.admin.routes');
const adminRoutes = require('../modules/admin/admin.routes');
const authRoutes = require('../modules/auth/auth.routes');
const doctorsPublicRoutes = require('../modules/doctors/doctors.routes');
const doctorsPortalRoutes = require('../modules/doctors/doctors.portal.routes');
const schedulesRoutes = require('../modules/schedules/schedules.routes');
const clinicsRoutes = require('../modules/clinics/clinics.routes');
const notificationsRoutes = require('../modules/notifications/notifications.routes');
const appointmentsRoutes = require('../modules/appointments/appointments.routes');
const appointmentsDoctorRoutes = require('../modules/appointments/appointments.doctor.routes');
const prescriptionsDoctorRoutes = require('../modules/prescriptions/prescriptions.doctor.routes');
const prescriptionsRoutes = require('../modules/prescriptions/prescriptions.routes');
const specialtiesRoutes = require('../modules/specialties/specialties.routes');
const languagesRoutes = require('../modules/languages/languages.routes');

const router = Router();

/**
 * API root — confirms the service is reachable under /api/v1.
 * Module routers will be mounted here as they are implemented.
 */
router.get('/', (_req, res) => {
  successResponse(res, {
    name: 'CareHub API',
    version: '1.0.0',
    status: 'ready',
    modules: {
      implemented: [
        'auth',
        'doctors',
        'specialties',
        'languages',
        'reviews',
        'uploads',
        'doctor-applications',
        'hospitals',
        'labs',
        'surgeries',
        'medicines',
        'admin',
        'notifications',
        'appointments',
        'schedules',
        'clinics',
        'prescriptions',
      ],
      planned: ['users'],
    },
  }, 'CareHub API is ready');
});

router.use('/doctors', reviewsDoctorRoutes);
router.use('/doctors', doctorsPortalRoutes);
router.use('/doctors', doctorsPublicRoutes);
router.use('/schedules', schedulesRoutes);
router.use('/clinics', clinicsRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/auth', authRoutes);
router.use('/uploads', uploadsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/', appointmentsRoutes);
router.use('/doctor/appointments', appointmentsDoctorRoutes);
router.use('/prescriptions', prescriptionsRoutes);
router.use('/doctor/prescriptions', prescriptionsDoctorRoutes);
router.use('/specialties', specialtiesRoutes);
router.use('/medical-specialties', specialtiesRoutes);
router.use('/languages', languagesRoutes);
router.use('/doctor-applications', doctorApplicationsRoutes);
router.use('/admin/doctor-applications', doctorApplicationsAdminRoutes);
router.use('/hospitals', hospitalsRoutes);
router.use('/admin/hospitals', hospitalsAdminRoutes);
router.use('/labs', labsRoutes);
router.use('/admin/labs', labsAdminRoutes);
router.use('/lab-bookings', labBookingsRoutes);
router.use('/surgeries', surgeriesRoutes);
router.use('/admin/surgeries', surgeriesAdminRoutes);
router.use('/medicines', medicinesRoutes);
router.use('/admin/medicines', medicinesAdminRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
