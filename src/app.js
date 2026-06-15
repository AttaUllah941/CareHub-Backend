const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const swaggerSpec = require('./config/swagger');
const { errorHandler, notFoundHandler } = require('./core/errors/errorHandler');
const { globalRateLimiter } = require('./core/middleware/rateLimiter.middleware');
const authRoutes = require('./features/auth/routes/auth.routes');
const userRoutes = require('./features/users/routes/user.routes');
const rbacRoutes = require('./features/roles/routes/role.routes');
const specialtyRoutes = require('./features/medical-specialties/routes/specialty.routes');
const languageRoutes = require('./features/languages/routes/language.routes');
const doctorRoutes = require('./features/doctors/routes/doctor.routes');
const doctorAvailabilityRoutes = require('./features/doctor-availability/routes/doctorAvailability.routes');
const clinicRoutes = require('./features/clinics/routes/clinic.routes');
const patientRoutes = require('./features/patients/routes/patient.routes');
const familyMemberRoutes = require('./features/family-members/routes/familyMember.routes');
const appointmentRoutes = require('./features/appointments/routes/appointment.routes');
const consultationRoutes = require('./features/consultations/routes/consultation.routes');
const prescriptionRoutes = require('./features/prescriptions/routes/prescription.routes');
const medicalRecordRoutes = require('./features/medical-records/routes/medicalRecord.routes');
const reviewRoutes = require('./features/reviews/routes/review.routes');
const notificationRoutes = require('./features/notifications/routes/notification.routes');
const paymentRoutes = require('./features/payments/routes/payment.routes');
const dashboardRoutes = require('./features/dashboard/routes/dashboard.routes');
const reportRoutes = require('./features/reports/routes/report.routes');
const videoConsultationRoutes = require('./features/video-consultations/routes/videoConsultation.routes');
const pharmacyRoutes = require('./features/pharmacy/routes/pharmacy.routes');
const labRoutes = require('./features/lab/routes/lab.routes');
const chatRoutes = require('./features/chat/routes/chat.routes');
const analyticsRoutes = require('./features/analytics/routes/analytics.routes');
const auditRoutes = require('./features/audit-logs/routes/audit.routes');
const settingsRoutes = require('./features/settings/routes/settings.routes');

/**
 * Creates and configures the Express application.
 * Feature routes are mounted under the API prefix.
 */
const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.cors.origin, credentials: true }));
  app.use(globalRateLimiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  if (!config.isProduction) {
    app.use(morgan('dev'));
  }

  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'CareHub API is running',
      timestamp: new Date().toISOString(),
      environment: config.env,
    });
  });

  app.use(`${config.apiPrefix}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use(`${config.apiPrefix}/auth`, authRoutes);
  app.use(`${config.apiPrefix}/users`, userRoutes);
  app.use(`${config.apiPrefix}/rbac`, rbacRoutes);
  app.use(`${config.apiPrefix}/medical-specialties`, specialtyRoutes);
  app.use(`${config.apiPrefix}/languages`, languageRoutes);
  app.use(`${config.apiPrefix}/doctors`, doctorRoutes);
  app.use(`${config.apiPrefix}/doctor-availability`, doctorAvailabilityRoutes);
  app.use(`${config.apiPrefix}/clinics`, clinicRoutes);
  app.use(`${config.apiPrefix}/patients`, patientRoutes);
  app.use(`${config.apiPrefix}/family-members`, familyMemberRoutes);
  app.use(`${config.apiPrefix}/appointments`, appointmentRoutes);
  app.use(`${config.apiPrefix}/consultations`, consultationRoutes);
  app.use(`${config.apiPrefix}/prescriptions`, prescriptionRoutes);
  app.use(`${config.apiPrefix}/medical-records`, medicalRecordRoutes);
  app.use(`${config.apiPrefix}/reviews`, reviewRoutes);
  app.use(`${config.apiPrefix}/notifications`, notificationRoutes);
  app.use(`${config.apiPrefix}/payments`, paymentRoutes);
  app.use(`${config.apiPrefix}/dashboard`, dashboardRoutes);
  app.use(`${config.apiPrefix}/reports`, reportRoutes);
  app.use(`${config.apiPrefix}/video-consultations`, videoConsultationRoutes);
  app.use(`${config.apiPrefix}/pharmacy`, pharmacyRoutes);
  app.use(`${config.apiPrefix}/lab`, labRoutes);
  app.use(`${config.apiPrefix}/chat`, chatRoutes);
  app.use(`${config.apiPrefix}/analytics`, analyticsRoutes);
  app.use(`${config.apiPrefix}/audit-logs`, auditRoutes);
  app.use(`${config.apiPrefix}/settings`, settingsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
