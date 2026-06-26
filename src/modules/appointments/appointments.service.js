const {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} = require('../../core/errors/AppError');
const doctorsRepository = require('../doctors/doctors.repository');
const usersRepository = require('../users/users.repository');
const appointmentsRepository = require('./appointments.repository');
const {
  notifyAppointmentConfirmed,
  notifyAppointmentCancelled,
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

  let doctorUserId = doctor?.userId?.toString() || null;
  let doctorEmail = '';

  if (doctor?.userId) {
    const doctorUser = await usersRepository.findById(doctor.userId);
    doctorEmail = doctorUser?.email || '';
    doctorUserId = doctorUser?._id?.toString() || doctorUserId;
  }

  return { doctorName, doctorId, doctorUserId, doctorEmail };
};

const confirmAppointment = async (id, doctorUser) => {
  const appointment = await getAppointmentOrThrow(id);
  const doctor = await doctorsRepository.findById(
    appointment.doctorId?._id || appointment.doctorId,
  );

  if (!doctor || doctor.userId.toString() !== doctorUser.id) {
    throw new ForbiddenError('You can only confirm your own appointments');
  }

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
  });

  return { appointment: toAppointmentResponse(updated) };
};

module.exports = {
  confirmAppointment,
  cancelAppointment,
  toAppointmentResponse,
};
