const {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require('../../core/errors/AppError');
const { parsePaginationQuery, buildPaginationMeta } = require('../../core/utils/pagination.util');
const doctorsRepository = require('../doctors/doctors.repository');
const usersRepository = require('../users/users.repository');
const appointmentsRepository = require('./appointments.repository');
const { UserRole } = require('../../shared/enums/userRole.enum');
const {
  notifyAppointmentBooked,
  notifyAppointmentConfirmed,
  notifyAppointmentCancelled,
  notifyAppointmentRejected,
} = require('../../shared/services/eventNotifications.service');

const formatScheduledAt = (date) =>
  new Date(date).toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const toAppointmentResponse = (appointment) => ({
  id: appointment._id.toString(),
  bookingRef: appointment.bookingRef || null,
  doctorId: appointment.doctorId?._id?.toString() || appointment.doctorId?.toString(),
  patientId: appointment.patientId?._id?.toString() || appointment.patientId?.toString() || null,
  status: appointment.status,
  scheduledAt: appointment.scheduledAt?.toISOString(),
  patientName: appointment.patientName || '',
  patientEmail: appointment.patientEmail || '',
  patientPhone:
    appointment.patientId?.phone ||
    appointment.patientPhone ||
    '',
  consultationType: appointment.consultationType || 'video',
  doctorName: appointment.doctorId?.fullName || '',
  createdAt: appointment.createdAt?.toISOString(),
  updatedAt: appointment.updatedAt?.toISOString(),
});

const getAppointmentOrThrow = async (id) => {
  if (!appointmentsRepository.isValidObjectId(id)) {
    throw new NotFoundError('Appointment not found');
  }

  const appointment = await appointmentsRepository.findById(id);
  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  return appointment;
};

const resolvePatientDetails = (appointment) => {
  const patient = appointment.patientId;
  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`.trim()
    : appointment.patientName || 'Patient';
  const patientEmail = patient?.email || appointment.patientEmail || '';
  const patientUserId = patient?._id?.toString() || appointment.patientId?.toString() || null;

  return { patientName, patientEmail, patientUserId };
};

const resolveDoctorDetails = async (appointment) => {
  const doctor = appointment.doctorId;
  const doctorName = doctor?.fullName || 'Doctor';
  const doctorId = doctor?._id || appointment.doctorId;

  const doctorUserRef = doctor?.userId?._id || doctor?.userId;
  let doctorUserId = doctorUserRef?.toString() || null;
  let doctorEmail = '';

  if (doctorUserRef) {
    const doctorUser = await usersRepository.findById(doctorUserRef);
    doctorEmail = doctorUser?.email || '';
    doctorUserId = doctorUser?._id?.toString() || doctorUserId;
  }

  return { doctorName, doctorId, doctorUserId, doctorEmail };
};

const getRefId = (value) => (value?._id ? value._id : value);

const assertDoctorOwnsAppointment = async (appointment, doctorUser, action) => {
  const loggedInDoctor = await doctorsRepository.findByUserId(doctorUser.id);
  if (!loggedInDoctor) {
    throw new ForbiddenError('Doctor profile not found');
  }

  const appointmentDoctorId = getRefId(appointment.doctorId)?.toString();
  if (appointmentDoctorId !== loggedInDoctor._id.toString()) {
    throw new ForbiddenError(`You can only ${action} your own appointments`);
  }

  return loggedInDoctor;
};

const confirmAppointment = async (id, doctorUser) => {
  const appointment = await getAppointmentOrThrow(id);
  await assertDoctorOwnsAppointment(appointment, doctorUser, 'confirm');

  if (appointment.status !== 'pending') {
    throw new BadRequestError(`Cannot confirm an appointment with status "${appointment.status}"`);
  }

  const updated = await appointmentsRepository.updateById(id, { status: 'confirmed' });
  const { patientName, patientEmail, patientUserId } = resolvePatientDetails(updated);
  const { doctorName } = await resolveDoctorDetails(updated);
  const scheduledAt = formatScheduledAt(updated.scheduledAt);

  await notifyAppointmentConfirmed({
    userId: patientUserId,
    email: patientEmail,
    patientName,
    doctorName,
    scheduledAt,
    appointmentId: id,
  });

  return { appointment: toAppointmentResponse(updated) };
};

const cancelAppointment = async (id, user) => {
  const appointment = await getAppointmentOrThrow(id);

  const isPatient =
    appointment.patientId &&
    (appointment.patientId._id?.toString() || appointment.patientId.toString()) === user.id;

  if (!isPatient) {
    throw new ForbiddenError('You can only cancel your own appointments');
  }

  if (!['pending', 'confirmed'].includes(appointment.status)) {
    throw new BadRequestError(`Cannot cancel an appointment with status "${appointment.status}"`);
  }

  const updated = await appointmentsRepository.updateById(id, { status: 'cancelled' });
  const { patientName, patientEmail, patientUserId } = resolvePatientDetails(updated);
  const { doctorName, doctorUserId, doctorEmail } = await resolveDoctorDetails(updated);
  const scheduledAt = formatScheduledAt(updated.scheduledAt);

  await notifyAppointmentCancelled({
    patientUserId,
    doctorUserId,
    patientEmail,
    doctorEmail,
    patientName,
    doctorName,
    scheduledAt,
    appointmentId: id,
  });

  return { appointment: toAppointmentResponse(updated) };
};

const createAppointment = async (payload, user) => {
  if (!user?.id) {
    throw new ForbiddenError('Please login first');
  }

  if (!doctorsRepository.isValidObjectId(payload.doctorId)) {
    throw new NotFoundError('Doctor not found');
  }

  const doctor = await doctorsRepository.findById(payload.doctorId);
  if (!doctor || doctor.verificationStatus !== 'VERIFIED') {
    throw new NotFoundError('Doctor not found');
  }

  const scheduledAt = new Date(payload.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    throw new BadRequestError('scheduledAt must be a future date-time');
  }

  const patient = await usersRepository.findById(user.id);
  if (!patient) {
    throw new NotFoundError('User not found');
  }

  const patientId = patient._id;
  const patientName = `${patient.firstName} ${patient.lastName}`.trim();
  const patientEmail = patient.email;
  const patientPhone = payload.patientPhone?.trim() || patient.phone || '';

  const existingAppointment = await appointmentsRepository.findByPatientAndDoctor(
    patientId,
    doctor._id,
    { statuses: ['pending', 'confirmed'] },
  );
  if (existingAppointment) {
    throw new ConflictError('An appointment with the selected doctor already exists.');
  }

  let appointment;
  try {
    appointment = await appointmentsRepository.create({
      doctorId: doctor._id,
      patientId,
      scheduledAt,
      patientName,
      patientEmail,
      patientPhone,
      consultationType: payload.consultationType || 'video',
      status: 'pending',
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ConflictError('An appointment with the selected doctor already exists.');
    }
    throw error;
  }

  const populated = await appointmentsRepository.findById(appointment._id);
  const { doctorName, doctorUserId } = await resolveDoctorDetails(populated);
  const formattedScheduledAt = formatScheduledAt(populated.scheduledAt);
  const adminUsers = await usersRepository.findActiveByRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const adminUserIds = adminUsers.map((admin) => admin._id.toString());

  await notifyAppointmentBooked({
    doctorUserId,
    adminUserIds,
    patientName,
    doctorName,
    scheduledAt: formattedScheduledAt,
    consultationType: payload.consultationType || 'video',
    appointmentId: appointment._id.toString(),
  });

  return { appointment: toAppointmentResponse(populated) };
};

const listPatientAppointments = async (user, query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, ['scheduledAt', 'createdAt']);

  const [appointments, total] = await Promise.all([
    appointmentsRepository.findByPatientId(user.id, {
      skip,
      limit,
      sort,
      status: query.status,
    }),
    appointmentsRepository.countByPatientId(user.id, { status: query.status }),
  ]);

  return {
    appointments: appointments.map(toAppointmentResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const listDoctorAppointments = async (doctorUser, query) => {
  const doctor = await doctorsRepository.findByUserId(doctorUser.id);
  if (!doctor) {
    throw new NotFoundError('Doctor profile not found');
  }

  const { page, limit, skip, sort } = parsePaginationQuery(query, ['scheduledAt', 'createdAt']);

  const [appointments, total] = await Promise.all([
    appointmentsRepository.findByDoctorId(doctor._id, {
      skip,
      limit,
      sort,
      status: query.status,
    }),
    appointmentsRepository.countByDoctorId(doctor._id, { status: query.status }),
  ]);

  return {
    appointments: appointments.map(toAppointmentResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const completeAppointment = async (id, doctorUser) => {
  const appointment = await getAppointmentOrThrow(id);
  await assertDoctorOwnsAppointment(appointment, doctorUser, 'complete');

  if (appointment.status !== 'confirmed') {
    throw new BadRequestError(`Cannot complete an appointment with status "${appointment.status}"`);
  }

  const updated = await appointmentsRepository.updateById(id, { status: 'completed' });
  return { appointment: toAppointmentResponse(updated) };
};

const rejectAppointment = async (id, doctorUser, rejectionReason) => {
  const appointment = await getAppointmentOrThrow(id);
  await assertDoctorOwnsAppointment(appointment, doctorUser, 'reject');

  if (appointment.status !== 'pending') {
    throw new BadRequestError(`Cannot reject an appointment with status "${appointment.status}"`);
  }

  const updated = await appointmentsRepository.updateById(id, { status: 'rejected' });
  const { patientName, patientEmail, patientUserId } = resolvePatientDetails(updated);
  const { doctorName } = await resolveDoctorDetails(updated);
  const scheduledAt = formatScheduledAt(updated.scheduledAt);

  await notifyAppointmentRejected({
    patientUserId,
    patientEmail,
    patientName,
    doctorName,
    scheduledAt,
    appointmentId: id,
    rejectionReason,
  });

  return { appointment: toAppointmentResponse(updated) };
};

module.exports = {
  createAppointment,
  listPatientAppointments,
  listDoctorAppointments,
  confirmAppointment,
  cancelAppointment,
  completeAppointment,
  rejectAppointment,
  toAppointmentResponse,
};
