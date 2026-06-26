const AppError = require('../../shared/errors/AppError');
const { generateBookingRef } = require('../../shared/utils/bookingRef.util');
const { normalizeDateString } = require('../../shared/utils/timeSlots.util');
const { parsePaginationQuery, buildPaginationMeta } = require('../../shared/utils/pagination');
const doctorContextService = require('../../shared/services/doctorContext.service');
const doctorsRepository = require('../doctors/doctors.repository');
const clinicsRepository = require('../clinics/clinics.repository');
const schedulesService = require('../schedules/schedules.service');
const appointmentsRepository = require('./appointments.repository');

const PATIENT_SORT_FIELDS = ['date', 'createdAt', 'status'];
const DOCTOR_SORT_FIELDS = ['date', 'createdAt', 'status', 'timeSlot'];

const getRefId = (value) => {
  if (!value) return null;
  return value._id ? value._id.toString() : value.toString();
};

const toAppointmentResponse = (appointment) => ({
  id: appointment._id.toString(),
  bookingRef: appointment.bookingRef,
  doctorId: appointment.doctorId?._id?.toString() || appointment.doctorId?.toString(),
  patientId: appointment.patientId?._id?.toString() || appointment.patientId?.toString() || null,
  clinicId: appointment.clinicId?._id?.toString() || appointment.clinicId?.toString() || null,
  consultationType: appointment.consultationType,
  date: appointment.date,
  timeSlot: appointment.timeSlot,
  city: appointment.city,
  patientSnapshot: appointment.patientSnapshot,
  status: appointment.status,
  fee: appointment.fee,
  currency: appointment.currency,
  confirmedAt: appointment.confirmedAt?.toISOString() || null,
  rejectionReason: appointment.rejectionReason || null,
  doctor: appointment.doctorId?.fullName
    ? {
        id: appointment.doctorId._id.toString(),
        name: appointment.doctorId.fullName,
        title: appointment.doctorId.title,
        city: appointment.doctorId.city,
      }
    : undefined,
  clinic: appointment.clinicId?.name
    ? {
        id: appointment.clinicId._id.toString(),
        name: appointment.clinicId.name,
        address: appointment.clinicId.address,
        city: appointment.clinicId.city,
      }
    : undefined,
  patient: appointment.patientId?.firstName
    ? {
        id: appointment.patientId._id.toString(),
        firstName: appointment.patientId.firstName,
        lastName: appointment.patientId.lastName,
        email: appointment.patientId.email,
        phone: appointment.patientId.phone,
      }
    : undefined,
  createdAt: appointment.createdAt?.toISOString(),
  updatedAt: appointment.updatedAt?.toISOString(),
});

const isAdmin = (user) => user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

const isPatientOwner = (appointment, user) =>
  Boolean(getRefId(appointment.patientId) && getRefId(appointment.patientId) === user.id);

const isDoctorOwner = (appointment, doctor) =>
  Boolean(doctor && getRefId(appointment.doctorId) === doctor._id.toString());

const assertCanView = (appointment, user, doctor) => {
  if (isAdmin(user) || isPatientOwner(appointment, user) || isDoctorOwner(appointment, doctor)) {
    return;
  }
  throw new AppError('You do not have permission to view this appointment', 403);
};

const assertPatientOwner = (appointment, user) => {
  if (!isPatientOwner(appointment, user)) {
    throw new AppError('You do not have permission to modify this appointment', 403);
  }
};

const assertDoctorOwner = (appointment, doctor) => {
  if (!isDoctorOwner(appointment, doctor)) {
    throw new AppError('You do not have permission to modify this appointment', 403);
  }
};

const assertSlotAvailable = async ({ doctorId, date, timeSlot, consultationType, clinicId }) => {
  const availability = await schedulesService.getAvailability(doctorId, date);

  const slotAvailable = availability.slots.some((slot) => {
    if (slot.timeSlot !== timeSlot || slot.consultationType !== consultationType) {
      return false;
    }

    if (consultationType === 'clinic') {
      return slot.clinicId === clinicId;
    }

    return true;
  });

  if (!slotAvailable) {
    throw new AppError('The selected time slot is not available', 409);
  }
};

const resolveFee = (doctor, clinic) => {
  if (clinic?.consultationFee != null) {
    return clinic.consultationFee;
  }

  return doctor.consultationFee ?? 0;
};

const buildListFilter = (query) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  const date = query.date ? normalizeDateString(query.date) : null;
  if (query.date && !date) {
    throw new AppError('Invalid date. Use YYYY-MM-DD format', 422);
  }
  if (date) {
    filter.date = date;
  }

  return filter;
};

const createAppointment = async (payload, user) => {
  const date = normalizeDateString(payload.date);
  if (!date) {
    throw new AppError('Invalid date. Use YYYY-MM-DD format', 422);
  }

  if (!appointmentsRepository.isValidObjectId(payload.doctorId)) {
    throw new AppError('Doctor not found', 404);
  }

  const doctor = await doctorsRepository.findVerifiedById(payload.doctorId);
  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  let clinic = null;
  if (payload.consultationType === 'clinic') {
    clinic = await clinicsRepository.findById(payload.clinicId);
    if (!clinic || !clinic.isActive) {
      throw new AppError('Clinic not found', 404);
    }
    if (clinic.doctorId.toString() !== payload.doctorId) {
      throw new AppError('Clinic does not belong to the selected doctor', 422);
    }
  }

  await assertSlotAvailable({
    doctorId: payload.doctorId,
    date,
    timeSlot: payload.timeSlot,
    consultationType: payload.consultationType,
    clinicId: payload.clinicId,
  });

  const patientId = user?.role === 'PATIENT' ? user.id : null;
  const bookingRef = generateBookingRef(payload.consultationType);

  const appointmentData = {
    bookingRef,
    doctorId: payload.doctorId,
    patientId,
    clinicId: payload.consultationType === 'clinic' ? payload.clinicId : null,
    consultationType: payload.consultationType,
    date,
    timeSlot: payload.timeSlot,
    city: payload.city,
    patientSnapshot: {
      name: payload.patient.name,
      age: payload.patient.age,
      gender: payload.patient.gender || '',
      phone: payload.patient.phone,
      email: payload.patient.email || '',
      notes: payload.patient.notes || '',
    },
    status: 'pending',
    fee: resolveFee(doctor, clinic),
    currency: doctor.currency || 'PKR',
  };

  const slotTaken = await appointmentsRepository.existsBlockingSlot(
    payload.doctorId,
    date,
    payload.timeSlot,
  );

  if (slotTaken) {
    throw new AppError('The selected time slot is no longer available', 409);
  }

  try {
    const appointment = await appointmentsRepository.create(appointmentData);
    const populated = await appointmentsRepository.findById(appointment._id);
    return { appointment: toAppointmentResponse(populated) };
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('The selected time slot is no longer available', 409);
    }
    throw error;
  }
};

const listMyPatientAppointments = async (user, query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(
    query,
    PATIENT_SORT_FIELDS,
    'date',
    10,
  );
  const filter = buildListFilter(query);

  const [appointments, total] = await Promise.all([
    appointmentsRepository.findByPatient(user.id, filter, { skip, limit, sort }),
    appointmentsRepository.countByPatient(user.id, filter),
  ]);

  return {
    appointments: appointments.map(toAppointmentResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const getAppointmentById = async (id, user, doctor) => {
  if (!appointmentsRepository.isValidObjectId(id)) {
    throw new AppError('Appointment not found', 404);
  }

  const appointment = await appointmentsRepository.findById(id);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  assertCanView(appointment, user, doctor);

  return { appointment: toAppointmentResponse(appointment) };
};

const cancelAppointment = async (id, user) => {
  if (!appointmentsRepository.isValidObjectId(id)) {
    throw new AppError('Appointment not found', 404);
  }

  const appointment = await appointmentsRepository.findById(id);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  assertPatientOwner(appointment, user);

  if (appointment.status === 'cancelled') {
    throw new AppError('Appointment is already cancelled', 400);
  }

  if (appointment.status === 'completed') {
    throw new AppError('Completed appointments cannot be cancelled', 400);
  }

  const updated = await appointmentsRepository.updateById(id, { status: 'cancelled' });
  return { appointment: toAppointmentResponse(updated) };
};

const listDoctorAppointments = async (doctor, query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(
    query,
    DOCTOR_SORT_FIELDS,
    'date',
    10,
  );
  const filter = buildListFilter(query);

  const [appointments, total] = await Promise.all([
    appointmentsRepository.findByDoctor(doctor._id, filter, { skip, limit, sort }),
    appointmentsRepository.countByDoctor(doctor._id, filter),
  ]);

  return {
    appointments: appointments.map(toAppointmentResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const confirmAppointment = async (id, doctor) => {
  const appointment = await getOwnedDoctorAppointment(id, doctor);

  if (!['pending'].includes(appointment.status)) {
    throw new AppError('Only pending appointments can be confirmed', 400);
  }

  const updated = await appointmentsRepository.updateById(id, {
    status: 'confirmed',
    confirmedAt: new Date(),
  });

  return { appointment: toAppointmentResponse(updated) };
};

const completeAppointment = async (id, doctor) => {
  const appointment = await getOwnedDoctorAppointment(id, doctor);

  if (!['pending', 'confirmed'].includes(appointment.status)) {
    throw new AppError('Only pending or confirmed appointments can be completed', 400);
  }

  const updated = await appointmentsRepository.updateById(id, { status: 'completed' });
  return { appointment: toAppointmentResponse(updated) };
};

const rejectAppointment = async (id, doctor, reason) => {
  const appointment = await getOwnedDoctorAppointment(id, doctor);

  if (!['pending', 'confirmed'].includes(appointment.status)) {
    throw new AppError('Only pending or confirmed appointments can be rejected', 400);
  }

  const updated = await appointmentsRepository.updateById(id, {
    status: 'rejected',
    rejectionReason: reason,
  });

  return { appointment: toAppointmentResponse(updated) };
};

const getOwnedDoctorAppointment = async (id, doctor) => {
  if (!appointmentsRepository.isValidObjectId(id)) {
    throw new AppError('Appointment not found', 404);
  }

  const appointment = await appointmentsRepository.findById(id);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  assertDoctorOwner(appointment, doctor);
  return appointment;
};

const resolveDoctorForAccess = async (user) => {
  if (user.role !== 'DOCTOR') {
    return null;
  }

  return doctorContextService.getDoctorByUserId(user.id);
};

module.exports = {
  createAppointment,
  listMyPatientAppointments,
  getAppointmentById,
  cancelAppointment,
  listDoctorAppointments,
  confirmAppointment,
  completeAppointment,
  rejectAppointment,
  resolveDoctorForAccess,
  toAppointmentResponse,
};
