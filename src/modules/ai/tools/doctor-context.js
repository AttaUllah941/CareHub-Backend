const doctorContextService = require('../../../shared/services/doctorContext.service');
const appointmentsService = require('../../appointments/appointments.service');

/** The doctor profile of the verified caller — the only doctor these tools can ever act for. */
const getDoctor = (ctx) => doctorContextService.getDoctorByUserId(ctx.user.id);

const PAGE_SIZE = 100;
const MAX_PAGES = 3;

/**
 * All of THIS doctor's appointments (service scopes by the caller), newest/oldest first.
 * Capped so a very large practice can't blow up a single tool call.
 */
const fetchMyAppointments = async (user, { status, sortOrder = 'desc' } = {}) => {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { appointments } = await appointmentsService.listDoctorAppointments(user, {
      page,
      limit: PAGE_SIZE,
      status,
      sortBy: 'scheduledAt',
      sortOrder,
    });
    all.push(...appointments);
    if (appointments.length < PAGE_SIZE) break;
  }
  return all;
};

/** YYYY-MM-DD of an instant in clinic time. */
const clinicDate = (value) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(value));

/** Patients (with an id) who have at least one appointment with this doctor. */
const patientsFromAppointments = (appointments) => {
  const patients = new Map();
  for (const appointment of appointments) {
    if (!appointment.patientId) continue;
    const entry = patients.get(appointment.patientId) || {
      id: appointment.patientId,
      name: appointment.patientName || 'Patient',
      phone: appointment.patientPhone || '',
      visits: 0,
      completed: 0,
      lastVisit: null,
      nextVisit: null,
    };
    entry.visits += 1;
    if (appointment.status === 'completed') entry.completed += 1;
    const at = new Date(appointment.scheduledAt);
    if (at <= new Date() && (!entry.lastVisit || at > new Date(entry.lastVisit))) {
      entry.lastVisit = appointment.scheduledAt;
    }
    if (
      at > new Date() &&
      ['pending', 'confirmed'].includes(appointment.status) &&
      (!entry.nextVisit || at < new Date(entry.nextVisit))
    ) {
      entry.nextVisit = appointment.scheduledAt;
    }
    patients.set(appointment.patientId, entry);
  }
  return patients;
};

module.exports = { getDoctor, fetchMyAppointments, clinicDate, patientsFromAppointments };
