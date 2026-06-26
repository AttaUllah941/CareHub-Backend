const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const errorMiddleware = require('./shared/middleware/error.middleware');
const AppError = require('./shared/errors/AppError');
const authRoutes = require('./modules/auth/auth.routes');
const specialtiesRoutes = require('./modules/specialties/specialties.routes');
const languagesRoutes = require('./modules/languages/languages.routes');
const doctorsRoutes = require('./modules/doctors/doctors.routes');
const doctorsAdminRoutes = require('./modules/doctors/doctors.admin.routes');
const clinicsRoutes = require('./modules/clinics/clinics.routes');
const schedulesRoutes = require('./modules/schedules/schedules.routes');
const appointmentsRoutes = require('./modules/appointments/appointments.routes');
const appointmentsDoctorRoutes = require('./modules/appointments/appointments.doctor.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!config.isProduction) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

const v1Router = express.Router();

v1Router.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'ok' });
});

v1Router.use('/auth', authRoutes);
v1Router.use('/medical-specialties', specialtiesRoutes);
v1Router.use('/languages', languagesRoutes);
v1Router.use('/doctors', doctorsRoutes);
v1Router.use('/admin/doctors', doctorsAdminRoutes);
v1Router.use('/clinics', clinicsRoutes);
v1Router.use('/schedules', schedulesRoutes);
v1Router.use('/appointments', appointmentsRoutes);
v1Router.use('/doctor/appointments', appointmentsDoctorRoutes);

app.use(config.apiPrefix, v1Router);

app.use((_req, _res, next) => {
  next(new AppError('Route not found', 404));
});

app.use(errorMiddleware);

module.exports = app;
